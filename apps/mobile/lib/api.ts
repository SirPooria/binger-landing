import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  'http://localhost:8080';

const ACCESS_KEY = 'binger_access_token';
const REFRESH_KEY = 'binger_refresh_token';

export interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  message?: string;
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as ApiEnvelope<{
    access_token: string;
    refresh_token: string;
  }>;
  if (!json.data) return false;
  await setTokens(json.data.access_token, json.data.refresh_token);
  return true;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init.headers as Record<string, string>) },
  });
  if (res.status === 401 && retry) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, init, false);
    await clearTokens();
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) {
    throw new Error(json.message ?? json.error ?? `API error ${res.status}`);
  }
  return json.data as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

/** Unauthenticated POST (login flows). */
export async function apiPostPublic<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) throw new Error(json.message ?? json.error ?? `API error ${res.status}`);
  return json.data as T;
}

export function authGoogleUrl(redirectUri: string): string {
  return `${API_BASE_URL}/api/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function authMagicLinkVerifyUrl(token: string, redirectUri: string): string {
  return `${API_BASE_URL}/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}
