import { ApiError, api, isUnreachable } from '@/api/client';
import type { WasteEntry } from '@/api/types';

import { markFailed, readQueue, recordAttempt, removeEntry, selectPending } from './queue';

export interface SyncResult {
  synced: number;
  /** Still queued because the network is down — these will be retried. */
  remaining: number;
  /** Permanently rejected by the server; retrying would not help. */
  failed: number;
  stoppedOffline: boolean;
}

const IDLE: SyncResult = { synced: 0, remaining: 0, failed: 0, stoppedOffline: false };

let inFlight: Promise<SyncResult> | null = null;

/**
 * Drains the queue oldest-first. Ordering matters: entries carry their own waste_date, but
 * draining in capture order keeps the server's created_at consistent with what the user saw.
 *
 * Concurrent calls share one run — NetInfo, app-foreground, and the interval all fire at once
 * when a truck pulls back into signal.
 */
export function syncPending(userId: string | undefined): Promise<SyncResult> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!userId) return IDLE;

    const queued = selectPending(await readQueue(), userId).sort((a, b) =>
      a.queuedAt.localeCompare(b.queuedAt),
    );
    if (queued.length === 0) return IDLE;

    let synced = 0;
    let failed = 0;

    for (const [index, entry] of queued.entries()) {
      try {
        await api<WasteEntry>('/waste-entries', {
          method: 'POST',
          body: {
            inventoryItemId: entry.inventoryItemId,
            quantity: entry.quantity,
            reason: entry.reason,
            wasteDate: entry.wasteDate,
            note: entry.note,
            clientUuid: entry.clientUuid,
          },
        });
        // The server is idempotent on clientUuid, so a success here is safe to act on even if
        // an earlier attempt actually landed and we never saw the response.
        await removeEntry(entry.clientUuid);
        synced += 1;
      } catch (error) {
        if (isUnreachable(error)) {
          await recordAttempt(entry.clientUuid);
          // Still offline. Stop rather than burn the rest of the queue against a dead network.
          return {
            synced,
            remaining: queued.length - index,
            failed,
            stoppedOffline: true,
          };
        }
        const message =
          error instanceof ApiError ? error.message : 'The server rejected this entry.';
        await markFailed(entry.clientUuid, message);
        failed += 1;
      }
    }

    return { synced, remaining: 0, failed, stoppedOffline: false };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
