import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { hashToken } from '../src/auth/crypto.js';
import { resetDb } from './setup.js';
import { makeUser } from './helpers.js';

const app = createApp();

describe('auth flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/magic-link stores a token and returns 200', async () => {
    const res = await request(app).post('/api/v1/auth/magic-link').send({ email: 'Magic@Test.local' });
    expect(res.status).toBe(200);
    const { rows } = await query('SELECT * FROM magic_link_tokens WHERE email = lower($1)', ['magic@test.local']);
    expect(rows.length).toBe(1);
  });

  it('POST /api/v1/auth/magic-link rejects an invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/magic-link').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('GET magic-link/verify with a valid token redirects with tokens', async () => {
    const raw = 'raw-token-abc-123';
    await query(
      `INSERT INTO magic_link_tokens (email, token_hash, redirect_uri, expires_at)
       VALUES (lower($1), $2, $3, now() + interval '15 minutes')`,
      ['verify@test.local', hashToken(raw), 'http://localhost:8080/auth/callback']
    );
    const res = await request(app)
      .get('/api/v1/auth/magic-link/verify')
      .query({ token: raw, redirect_uri: 'http://localhost:8080/auth/callback' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('access_token=');
    expect(res.headers.location).toContain('refresh_token=');

    // The user was created on first verify.
    const { rows } = await query('SELECT * FROM users WHERE email = $1', ['verify@test.local']);
    expect(rows.length).toBe(1);
  });

  it('GET magic-link/verify with an invalid token returns 400', async () => {
    const res = await request(app).get('/api/v1/auth/magic-link/verify').query({ token: 'nope' });
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/auth/me requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me returns the current user when authenticated', async () => {
    const { auth, user } = await makeUser();
    const res = await request(app).get('/api/v1/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
  });

  it('POST /api/v1/auth/refresh issues a new token pair', async () => {
    const { tokens } = await makeUser();
    const res = await request(app).post('/api/v1/auth/refresh').send({ refresh_token: tokens.refresh_token });
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeTruthy();
    expect(res.body.data.refresh_token).toBeTruthy();
    // Old refresh token is rotated out and no longer valid.
    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refresh_token: tokens.refresh_token });
    expect(reuse.status).toBe(401);
  });

  it('PATCH /api/v1/auth/onboarding-complete flips the flag', async () => {
    const { auth, user } = await makeUser();
    expect(user.onboarding_complete).toBe(false);
    const res = await request(app).patch('/api/v1/auth/onboarding-complete').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.onboarding_complete).toBe(true);
  });
});
