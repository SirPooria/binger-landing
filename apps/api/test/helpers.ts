import { createUser, issueTokens } from '../src/auth/service.js';
import type { DbUser, TokenPair } from '../src/types.js';

let counter = 0;

/** Creates a user (with profile) and returns the user + a fresh token pair. */
export async function makeUser(
  overrides: { email?: string; full_name?: string } = {}
): Promise<{ user: DbUser; tokens: TokenPair; auth: { Authorization: string } }> {
  counter++;
  const email = overrides.email ?? `test_user_${counter}_${Date.now()}@test.binger.local`;
  const user = await createUser({ email, full_name: overrides.full_name ?? `Test User ${counter}` });
  const tokens = await issueTokens(user);
  return {
    user,
    tokens,
    auth: { Authorization: `Bearer ${tokens.access_token}` },
  };
}
