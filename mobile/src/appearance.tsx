import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'nokori.appearance';

export type AppearancePreference = 'system' | 'light' | 'dark';

interface AppearanceValue {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

/**
 * Deliberately kept free of any import from the theme so `theme.ts` can depend on this
 * without a cycle.
 */
const AppearanceContext = createContext<AppearanceValue>({
  preference: 'system',
  setPreference: () => undefined,
});

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  // Restore before first paint where possible; a wrong-theme flash is worse than a beat of delay.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(KEY).then((stored) => {
      if (cancelled) return;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppearanceValue>(
    () => ({
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        void AsyncStorage.setItem(KEY, next);
      },
    }),
    [preference],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/** Falls back to following the system when no provider is mounted. */
export function useAppearance(): AppearanceValue {
  return useContext(AppearanceContext);
}
