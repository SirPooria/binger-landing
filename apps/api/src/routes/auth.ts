import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { randomToken, hashToken } from '../auth/crypto.js';
import {
  createMagicLink,
  verifyMagicLink,
  issueTokens,
  refreshSession,
  revokeRefresh,
  findOrCreateGoogle,
  findUserById,
  toAuthUser,
  setOnboardingComplete,
} from '../auth/service.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function redirectWithTokens(redirectUri: string, tokens: { access_token: string; refresh_token: string }) {
  const url = new URL(redirectUri);
  url.searchParams.set('access_token', tokens.access_token);
  url.searchParams.set('refresh_token', tokens.refresh_token);
  return url.toString();
}

// POST /api/v1/auth/magic-link
authRouter.post('/magic-link', async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    redirect_uri: z.string().optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'invalid_email' });
  try {
    await createMagicLink(body.data.email, body.data.redirect_uri ?? config.auth.defaultAppRedirect);
    res.json({ data: { message: 'لینک ورود به ایمیل شما ارسال شد.' } });
  } catch (e) {
    console.error('[auth] magic-link', e);
    res.status(500).json({ error: 'send_failed' });
  }
});

// GET /api/v1/auth/magic-link/verify?token=...&redirect_uri=...
authRouter.get('/magic-link/verify', async (req, res) => {
  const token = String(req.query.token ?? '');
  const redirectUri = String(req.query.redirect_uri ?? config.auth.defaultAppRedirect);
  if (!token) return res.status(400).send('توکن نامعتبر');
  const session = await verifyMagicLink(token);
  if (!session) return res.status(400).send('لینک منقضی یا استفاده شده است.');
  res.redirect(302, redirectWithTokens(redirectUri, session));
});

// GET /api/v1/auth/google?redirect_uri=binger://auth/callback
authRouter.get('/google', async (req, res) => {
  if (!config.auth.googleClientId) {
    return res.status(503).json({ error: 'google_not_configured' });
  }
  const redirectUri = String(req.query.redirect_uri ?? config.auth.defaultAppRedirect);
  const state = randomToken(16);
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    `INSERT INTO oauth_states (state, redirect_uri, expires_at) VALUES ($1, $2, $3)`,
    [state, redirectUri, expires.toISOString()]
  );
  const callbackUrl = `${config.auth.publicApiUrl}/api/v1/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: config.auth.googleClientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/v1/auth/google/callback
authRouter.get('/google/callback', async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  if (!code || !state) return res.status(400).send('ورود گوگل ناموفق بود.');

  const { rows } = await query<{ redirect_uri: string; expires_at: Date }>(
    `SELECT redirect_uri, expires_at FROM oauth_states WHERE state = $1`,
    [state]
  );
  await query('DELETE FROM oauth_states WHERE state = $1', [state]);
  const st = rows[0];
  if (!st || new Date(st.expires_at) < new Date()) return res.status(400).send('نشست ورود منقضی شده. دوباره تلاش کنید.');

  try {
    const callbackUrl = `${config.auth.publicApiUrl}/api/v1/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.auth.googleClientId,
        client_secret: config.auth.googleClientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('[google] token', tokenJson);
      return res.status(400).send('ورود گوگل ناموفق بود.');
    }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileRes.json()) as { id: string; email: string; name?: string; picture?: string };
    if (!profile.email) return res.status(400).send('ایمیل گوگل در دسترس نیست.');

    const user = await findOrCreateGoogle({
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
    const session = await issueTokens(user);
    res.redirect(302, redirectWithTokens(st.redirect_uri, session));
  } catch (e) {
    console.error('[google] callback', e);
    res.status(500).send('خطای سرور در ورود گوگل.');
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const body = z.object({ refresh_token: z.string().min(10) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'invalid_body' });
  const session = await refreshSession(body.data.refresh_token);
  if (!session) return res.status(401).json({ error: 'invalid_refresh' });
  res.json({ data: session });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', async (req, res) => {
  const body = z.object({ refresh_token: z.string().optional() }).safeParse(req.body);
  if (body.success && body.data.refresh_token) await revokeRefresh(body.data.refresh_token);
  res.json({ data: { ok: true } });
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ data: req.user });
});

// PATCH /api/v1/auth/onboarding-complete
authRouter.patch('/onboarding-complete', requireAuth, async (req, res) => {
  await setOnboardingComplete(req.user!.id);
  const user = await findUserById(req.user!.id);
  res.json({ data: user ? await toAuthUser(user) : req.user });
});
