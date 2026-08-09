import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ItemCategory, ItemUnit, WasteReason } from '@/api/types';

const QUEUE_KEY = 'nokori.offlineQueue';

export type PendingStatus = 'pending' | 'failed';

/**
 * A waste entry captured on the device that the server has not accepted yet.
 *
 * Item details are snapshotted alongside the ids so the pending list renders — and the
 * dollar figure is shown — with no network and no inventory cache.
 */
export interface PendingEntry {
  /** Idempotency key. Matches the server's unique (business_id, client_uuid), so a replay lands once. */
  clientUuid: string;
  /**
   * Owner of the entry at capture time. Two people share a truck's phone; without this a queue
   * captured before a sign-out would post into whoever signs in next.
   */
  userId: string;
  inventoryItemId: string;
  itemName: string;
  category: ItemCategory;
  unit: ItemUnit;
  costPerUnit: number;
  quantity: number;
  reason: WasteReason;
  reasonLabel: string;
  wasteDate: string;
  note?: string;
  queuedAt: string;
  attempts: number;
  status: PendingStatus;
  /** Why the server permanently rejected it — only set when status is 'failed'. */
  error?: string;
}

type Listener = (entries: PendingEntry[]) => void;

const listeners = new Set<Listener>();

/**
 * Serialises writes. Sync and a fresh log can finish at the same moment, and a
 * read-modify-write race would silently drop an entry the user believes is saved.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  writeChain = result.catch(() => undefined);
  return result;
}

export async function readQueue(): Promise<PendingEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingEntry[]) : [];
  } catch {
    // A corrupt queue must not brick logging; start clean rather than throw on every read.
    return [];
  }
}

async function writeQueue(entries: PendingEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  for (const listener of listeners) listener(entries);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  void readQueue().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enqueue(entry: PendingEntry): Promise<PendingEntry[]> {
  return serialize(async () => {
    const entries = await readQueue();
    // Same clientUuid twice means a retry of the same capture, not a second entry.
    const next = [...entries.filter((e) => e.clientUuid !== entry.clientUuid), entry];
    await writeQueue(next);
    return next;
  });
}

export function removeEntry(clientUuid: string): Promise<PendingEntry[]> {
  return serialize(async () => {
    const next = (await readQueue()).filter((e) => e.clientUuid !== clientUuid);
    await writeQueue(next);
    return next;
  });
}

export function markFailed(clientUuid: string, error: string): Promise<PendingEntry[]> {
  return serialize(async () => {
    const next = (await readQueue()).map((entry) =>
      entry.clientUuid === clientUuid
        ? { ...entry, status: 'failed' as const, error, attempts: entry.attempts + 1 }
        : entry,
    );
    await writeQueue(next);
    return next;
  });
}

export function recordAttempt(clientUuid: string): Promise<PendingEntry[]> {
  return serialize(async () => {
    const next = (await readQueue()).map((entry) =>
      entry.clientUuid === clientUuid ? { ...entry, attempts: entry.attempts + 1 } : entry,
    );
    await writeQueue(next);
    return next;
  });
}

/** Clears entries the server permanently rejected, once the user has seen why. */
export function clearFailed(): Promise<PendingEntry[]> {
  return serialize(async () => {
    const next = (await readQueue()).filter((entry) => entry.status !== 'failed');
    await writeQueue(next);
    return next;
  });
}

/** Called on sign-out and account deletion so nothing leaks into the next session. */
export function clearQueue(): Promise<PendingEntry[]> {
  return serialize(async () => {
    await writeQueue([]);
    return [];
  });
}

export const selectPending = (entries: PendingEntry[], userId: string | undefined): PendingEntry[] =>
  entries.filter((entry) => entry.status === 'pending' && (!userId || entry.userId === userId));

export const selectFailed = (entries: PendingEntry[], userId: string | undefined): PendingEntry[] =>
  entries.filter((entry) => entry.status === 'failed' && (!userId || entry.userId === userId));
