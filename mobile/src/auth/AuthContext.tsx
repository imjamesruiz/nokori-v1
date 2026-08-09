import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, isUnreachable, setSessionExpiredHandler, tokens } from '@/api/client';
import type { AuthResponse, MeResponse } from '@/api/types';
import { clearInventoryCache } from '@/offline/inventoryCache';
import { clearQueue } from '@/offline/queue';

import { cacheUser, clearCachedUser, readCachedUser } from './userCache';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: AuthStatus;
  user: MeResponse | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Re-reads /auth/me — call after creating the business so routing picks up hasBusiness. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<MeResponse | null>(null);
  const queryClient = useQueryClient();

  const clearSession = useCallback(async () => {
    await tokens.clear();
    // Queued entries belong to the account that captured them; leaving them would post one
    // owner's waste into the next owner's business on a shared phone.
    await Promise.all([clearQueue(), clearInventoryCache(), clearCachedUser()]);
    setUser(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  // Restore the session on launch so a returning user lands on Home, not sign-in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { accessToken } = await tokens.read();
      if (!accessToken) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        const me = await api<MeResponse>('/auth/me');
        if (cancelled) return;
        void cacheUser(me);
        setUser(me);
        setStatus('signedIn');
      } catch (error) {
        if (cancelled) return;
        // Launching with no signal is not a rejected session. Signing out here would strand
        // the user at the login screen — and take their queued entries with it.
        const cached = isUnreachable(error) ? await readCachedUser() : null;
        if (cached) {
          setUser(cached);
          setStatus('signedIn');
          return;
        }
        await clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void clearSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const authenticate = useCallback(
    async (path: '/auth/login' | '/auth/register', email: string, password: string) => {
      const auth = await api<AuthResponse>(path, {
        method: 'POST',
        auth: false,
        body: { email: email.trim(), password },
      });
      await tokens.save(auth);
      void cacheUser(auth.user);
      setUser(auth.user);
      setStatus('signedIn');
    },
    [],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      signIn: (email, password) => authenticate('/auth/login', email, password),
      signUp: (email, password) => authenticate('/auth/register', email, password),
      signOut: clearSession,
      deleteAccount: async () => {
        await api<void>('/auth/me', { method: 'DELETE' });
        await clearSession();
      },
      refreshUser: async () => {
        const me = await api<MeResponse>('/auth/me');
        void cacheUser(me);
        setUser(me);
      },
    }),
    [status, user, authenticate, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
