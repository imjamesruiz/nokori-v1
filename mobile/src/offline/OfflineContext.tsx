import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/AuthContext';

import { type PendingEntry, clearFailed, selectFailed, selectPending, subscribe } from './queue';
import { syncPending } from './sync';

interface OfflineValue {
  pending: PendingEntry[];
  failed: PendingEntry[];
  syncing: boolean;
  syncNow: () => Promise<void>;
  dismissFailed: () => Promise<void>;
}

const OfflineContext = createContext<OfflineValue | null>(null);

/** Fallback poll for the case where NetInfo reports connected but the API is still unreachable. */
const RETRY_INTERVAL_MS = 60_000;

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [syncing, setSyncing] = useState(false);

  const userId = user?.userId;
  // Kept in a ref so the listeners below don't need re-subscribing on every user change.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => subscribe(setEntries), []);

  const runSync = useCallback(async () => {
    if (!userIdRef.current) return;
    setSyncing(true);
    try {
      const result = await syncPending(userIdRef.current);
      if (result.synced > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
          queryClient.invalidateQueries({ queryKey: ['history'] }),
          queryClient.invalidateQueries({ queryKey: ['report'] }),
        ]);
      }
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  // Signal returning is the moment that matters for a truck parked at an event.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void runSync();
      }
    });
    return unsubscribe;
  }, [runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void runSync();
    });
    return () => subscription.remove();
  }, [runSync]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (selectPending(entries, userIdRef.current).length > 0) void runSync();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [entries, runSync]);

  // Drain whatever a previous session left behind, once we know who is signed in.
  useEffect(() => {
    if (userId) void runSync();
  }, [userId, runSync]);

  const value = useMemo<OfflineValue>(
    () => ({
      pending: selectPending(entries, userId),
      failed: selectFailed(entries, userId),
      syncing,
      syncNow: runSync,
      dismissFailed: async () => {
        await clearFailed();
      },
    }),
    [entries, userId, syncing, runSync],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineValue {
  const value = useContext(OfflineContext);
  if (!value) throw new Error('useOffline must be used inside <OfflineProvider>');
  return value;
}
