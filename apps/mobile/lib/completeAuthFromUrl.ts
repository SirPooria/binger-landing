import type { AuthUser } from '@binger/shared';
import { parseAuthTokensFromUrl } from './parseAuthCallback';

/** Returns tokens parsed from an OAuth browser redirect URL, if present. */
export function tokensFromAuthSessionUrl(
  resultUrl: string | undefined
): { access: string; refresh: string } | null {
  if (!resultUrl) return null;
  return parseAuthTokensFromUrl(resultUrl);
}

export type AuthSessionResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };
