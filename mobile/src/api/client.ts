import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { deleteItem, getItem, setItem } from './storage';
import type { AuthResponse } from './types';

const ACCESS_TOKEN_KEY = 'nokori.accessToken';
const REFRESH_TOKEN_KEY = 'nokori.refreshToken';

/**
 * Android emulators reach the host machine at 10.0.2.2, not localhost. Set EXPO_PUBLIC_API_URL
 * (or `extra.apiBaseUrl` in app.json) to your machine's LAN address when testing on a real phone.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromConfig = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  const base = fromConfig ?? 'http://localhost:8080';
  if (Platform.OS === 'android' && base.includes('localhost')) {
    return base.replace('localhost', '10.0.2.2');
  }
  return base.replace(/\/$/, '');
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** The user has an account but has not finished onboarding — the app should route to setup. */
  get needsBusiness(): boolean {
    return this.code === 'business_required';
  }
}

/**
 * "Try again later" rather than "this will never work": the request never reached the API, or
 * it hit a gateway that was down. Drives the offline queue and offline session restore (F-012).
 */
export function isUnreachable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

export const tokens = {
  async read(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([
      getItem(ACCESS_TOKEN_KEY),
      getItem(REFRESH_TOKEN_KEY),
    ]);
    return { accessToken, refreshToken };
  },
  async save(auth: Pick<AuthResponse, 'accessToken' | 'refreshToken'>): Promise<void> {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, auth.accessToken),
      setItem(REFRESH_TOKEN_KEY, auth.refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

/** Called when refreshing fails, so the app can drop back to the sign-in screen. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken } = await tokens.read();
    if (!refreshToken) return null;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Offline mid-refresh. The tokens are still good — surface it as unreachable so the
      // caller can queue, instead of destroying the session over a dead network.
      throw new ApiError(0, 'network_error', `Can't reach Nokori at ${API_BASE_URL}.`);
    }
    if (!response.ok) {
      await tokens.clear();
      onSessionExpired?.();
      return null;
    }
    const auth = (await response.json()) as AuthResponse;
    await tokens.save(auth);
    return auth.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'server_error';
  let message = 'Something went wrong. Please try again.';
  let fieldErrors: Record<string, string> | undefined;
  try {
    const body = await response.json();
    code = body.code ?? code;
    message = body.message ?? message;
    fieldErrors = body.fieldErrors ?? undefined;
  } catch {
    // Non-JSON error body (proxy, timeout page) — keep the generic message.
  }
  return new ApiError(response.status, code, message, fieldErrors);
}

async function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const withAuth = options.auth !== false;
  const { accessToken } = withAuth ? await tokens.read() : { accessToken: null };

  let response: Response;
  try {
    response = await send(path, options, accessToken);
  } catch {
    throw new ApiError(0, 'network_error', `Can't reach Nokori at ${API_BASE_URL}. Is the API running?`);
  }

  // One transparent retry after a silent token refresh (PRD F-001).
  if (response.status === 401 && withAuth) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      response = await send(path, options, fresh);
    } else {
      throw await toApiError(response);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** CSV export needs the raw body plus the auth header, so it bypasses the JSON helper. */
export async function fetchCsv(query: Record<string, string | undefined>): Promise<string> {
  const { accessToken } = await tokens.read();
  const response = await fetch(buildUrl('/exports/waste.csv', query), {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw await toApiError(response);
  return response.text();
}
