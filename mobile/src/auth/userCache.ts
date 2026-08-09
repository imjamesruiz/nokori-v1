import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MeResponse } from '@/api/types';

const USER_KEY = 'nokori.user';

/**
 * Last known identity, so a launch with no signal can restore the session instead of
 * bouncing the user to sign-in. Holding a valid refresh token is what makes them signed in;
 * /auth/me only tells us who they are and whether onboarding is done.
 */
export async function cacheUser(user: MeResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Non-fatal: worst case the next offline launch routes through sign-in.
  }
}

export async function readCachedUser(): Promise<MeResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeResponse;
    return parsed && typeof parsed.userId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}
