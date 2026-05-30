import type { AuthUser } from '@binger/shared';
import { apiGet, apiPostPublic, apiPatch, setTokens, clearTokens, getAccessToken } from './api';

export interface Session {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export async function sendMagicLink(email: string, redirectUri: string): Promise<void> {
  await apiPostPublic<{ message: string }>('/auth/magic-link', { email, redirect_uri: redirectUri });
}

export async function applyTokensFromCallback(accessToken: string, refreshToken: string): Promise<AuthUser> {
  await setTokens(accessToken, refreshToken);
  return apiGet<AuthUser>('/auth/me');
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiGet<AuthUser>('/auth/me');
  } catch {
    return null;
  }
}

export async function completeOnboarding(): Promise<AuthUser> {
  return apiPatch<AuthUser>('/auth/onboarding-complete');
}

export async function logout(): Promise<void> {
  const { getRefreshToken } = await import('./api');
  const refresh = await getRefreshToken();
  try {
    if (refresh) await apiPostPublic('/auth/logout', { refresh_token: refresh });
  } catch {
    /* ignore */
  }
  await clearTokens();
}
