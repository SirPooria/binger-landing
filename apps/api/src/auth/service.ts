import { query } from '../db.js';
import { config } from '../config.js';
import { randomToken, hashToken } from './crypto.js';
import { signAccess } from './jwt.js';
import type { AuthUser, DbUser, TokenPair } from '../types.js';

export async function findUserById(id: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] ?? null;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] ?? null;
}

/** Creates user + profile row (trigger also runs). */
export async function createUser(opts: {
  email: string;
  google_id?: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<DbUser> {
  const username = opts.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);
  const { rows } = await query<DbUser>(
    `INSERT INTO users (email, google_id, full_name, avatar_url)
     VALUES (lower($1), $2, $3, $4)
     RETURNING *`,
    [opts.email, opts.google_id ?? null, opts.full_name ?? null, opts.avatar_url ?? null]
  );
  const user = rows[0];
  await query(
    `INSERT INTO profiles (id, username, full_name, avatar_url, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET
       full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
       updated_at = now()`,
    [user.id, `${username}_${user.id.slice(0, 6)}`, opts.full_name ?? null, opts.avatar_url ?? null]
  );
  return user;
}

export async function findOrCreateByEmail(email: string): Promise<DbUser> {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  return createUser({ email });
}

export async function findOrCreateGoogle(profile: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<DbUser> {
  let user = await findUserByGoogleId(profile.sub);
  if (user) return user;
  user = await findUserByEmail(profile.email);
  if (user) {
    await query(
      `UPDATE users SET google_id = $1, full_name = COALESCE(full_name, $2), avatar_url = COALESCE(avatar_url, $3) WHERE id = $4`,
      [profile.sub, profile.name ?? null, profile.picture ?? null, user.id]
    );
    return (await findUserById(user.id))!;
  }
  return createUser({
    email: profile.email,
    google_id: profile.sub,
    full_name: profile.name,
    avatar_url: profile.picture,
  });
}

export async function toAuthUser(user: DbUser): Promise<AuthUser> {
  const { rows } = await query<{ username: string | null }>(
    'SELECT username FROM profiles WHERE id = $1',
    [user.id]
  );
  return {
    id: user.id,
    email: user.email,
    onboarding_complete: user.onboarding_complete,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    username: rows[0]?.username ?? null,
  };
}

export async function issueTokens(user: DbUser): Promise<TokenPair> {
  const authUser = await toAuthUser(user);
  const access_token = signAccess(authUser);
  const refresh_token = randomToken(48);
  const expires_at = new Date(Date.now() + config.auth.refreshTtlSec * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(refresh_token), expires_at.toISOString()]
  );
  return {
    access_token,
    refresh_token,
    expires_in: config.auth.accessTtlSec,
    user: authUser,
  };
}

export async function refreshSession(refreshToken: string): Promise<TokenPair | null> {
  const hash = hashToken(refreshToken);
  const { rows } = await query<{ user_id: string; expires_at: Date }>(
    `SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [hash]
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at) < new Date()) return null;
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
  const user = await findUserById(row.user_id);
  if (!user) return null;
  return issueTokens(user);
}

export async function revokeRefresh(refreshToken: string): Promise<void> {
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(refreshToken)]);
}

export async function createMagicLink(email: string, redirectUri?: string): Promise<void> {
  const token = randomToken(32);
  const expires_at = new Date(Date.now() + config.auth.magicLinkTtlSec * 1000);
  await query(
    `INSERT INTO magic_link_tokens (email, token_hash, redirect_uri, expires_at) VALUES (lower($1), $2, $3, $4)`,
    [email, hashToken(token), redirectUri ?? null, expires_at.toISOString()]
  );
  const verifyUrl = `${config.auth.publicApiUrl}/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}${
    redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ''
  }`;
  await sendMagicLinkEmail(email, verifyUrl);
}

async function sendMagicLinkEmail(email: string, verifyUrl: string) {
  const { sendMagicLinkEmail: send } = await import('./email.js');
  await send(email, verifyUrl);
}

export async function verifyMagicLink(token: string): Promise<TokenPair | null> {
  const hash = hashToken(token);
  const { rows } = await query<{ email: string; expires_at: Date; used_at: Date | null }>(
    `SELECT email, expires_at, used_at FROM magic_link_tokens WHERE token_hash = $1`,
    [hash]
  );
  const row = rows[0];
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;
  await query('UPDATE magic_link_tokens SET used_at = now() WHERE token_hash = $1', [hash]);
  const user = await findOrCreateByEmail(row.email);
  return issueTokens(user);
}

export async function setOnboardingComplete(userId: string): Promise<void> {
  await query('UPDATE users SET onboarding_complete = true WHERE id = $1', [userId]);
}
