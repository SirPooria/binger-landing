import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

function pickParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Parse tokens from a redirect URL (exp://, binger://, or https://). */
export function parseAuthTokensFromUrl(url: string): { access: string; refresh: string } | null {
  const parsed = Linking.parse(url);
  const access = pickParam(parsed.queryParams?.access_token as string | string[] | undefined);
  const refresh = pickParam(parsed.queryParams?.refresh_token as string | string[] | undefined);
  if (!access || !refresh) return null;
  return { access, refresh };
}

/** Read access/refresh tokens from route params, window (web), or initial deep link. */
export async function parseAuthCallbackTokens(
  params: { access_token?: string | string[]; refresh_token?: string | string[] }
): Promise<{ access: string; refresh: string } | null> {
  let access = pickParam(params.access_token);
  let refresh = pickParam(params.refresh_token);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const qs = new URLSearchParams(window.location.search);
    access = access ?? qs.get('access_token') ?? undefined;
    refresh = refresh ?? qs.get('refresh_token') ?? undefined;
  }

  if (!access || !refresh) {
    const url = await Linking.getInitialURL();
    if (url) {
      const fromUrl = parseAuthTokensFromUrl(url);
      if (fromUrl) return fromUrl;
    }
  }

  if (!access || !refresh) return null;
  return { access, refresh };
}
