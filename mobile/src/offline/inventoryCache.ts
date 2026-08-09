import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InventoryItem } from '@/api/types';

/**
 * The two lists are cached separately. The Inventory tab asks for everything including
 * deactivated items; Log Waste asks for active ones only. Caching them under one key meant
 * whichever screen loaded last decided what the other saw offline.
 */
const KEYS = {
  active: 'nokori.inventoryCache.active',
  all: 'nokori.inventoryCache.all',
} as const;

type Scope = keyof typeof KEYS;

interface CachedInventory {
  userId: string;
  items: InventoryItem[];
  cachedAt: string;
}

export const scopeFor = (includeInactive: boolean): Scope => (includeInactive ? 'all' : 'active');

/**
 * Last known good item list.
 *
 * Without this the offline queue is useless: a truck that loses signal opens Log Waste, the
 * inventory request fails, and the screen offers nothing to log against. The list changes
 * rarely, so a snapshot of the last successful fetch is a good enough source of truth for the
 * item name, unit, and cost the queue needs.
 */
export async function cacheInventory(userId: string, scope: Scope, items: InventoryItem[]): Promise<void> {
  const payload: CachedInventory = { userId, items, cachedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(KEYS[scope], JSON.stringify(payload));
  } catch {
    // A full disk must not break logging while online.
  }
}

async function read(userId: string, scope: Scope): Promise<InventoryItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS[scope]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedInventory;
    // Only ever hand back a list belonging to the signed-in user.
    if (parsed.userId !== userId || !Array.isArray(parsed.items)) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

export async function readCachedInventory(
  userId: string | undefined,
  scope: Scope,
): Promise<InventoryItem[] | null> {
  if (!userId) return null;

  const exact = await read(userId, scope);
  if (exact) return exact;

  // The active list is derivable from the full one, so a cached 'all' can stand in for 'active'.
  if (scope === 'active') {
    const all = await read(userId, 'all');
    if (all) return all.filter((item) => item.active);
  }
  return null;
}

export async function clearInventoryCache(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.active, KEYS.all]);
}
