/**
 * End-to-end smoke test for the full Binger stack (nginx + api + postgres + redis).
 *
 * Exercises the real wiring over HTTP against the running Docker stack:
 *   health -> public TMDB proxy -> magic-link request -> verify (token issuance)
 *   -> authenticated /me -> watchlist CRUD -> rating upsert -> token refresh
 *
 * Run via scripts/e2e.sh (which boots the stack first). The raw magic-link
 * token is read from the API container logs (the API logs the link whenever
 * SMTP is unconfigured or delivery fails — see apps/api/src/auth/email.ts).
 */
import { execSync } from 'node:child_process';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const COMPOSE = process.env.E2E_COMPOSE ?? 'infra/docker-compose.yml';

let passed = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (!cond) {
    console.error(`  ✗ ${label}`, detail ?? '');
    throw new Error(`E2E assertion failed: ${label}`);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { res, body: body as any };
}

/** Pull the most recent magic-link token for `email` out of the API logs. */
function readMagicToken(email: string): string | null {
  const logs = execSync(`docker compose -f ${COMPOSE} logs api --since 60s --no-color`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  // Find the verify URL(s); take the last one (most recent request is ours).
  const matches = [...logs.matchAll(/magic-link\/verify\?token=([^\s&"]+)/g)];
  if (!matches.length) return null;
  return decodeURIComponent(matches[matches.length - 1][1]);
}

async function main() {
  console.log(`\n[e2e] target: ${BASE_URL}\n`);

  // 1) Health
  {
    const { res, body } = await getJson('/api/v1/health');
    check('GET /health -> 200 ok', res.status === 200 && body.status === 'ok', body);
  }

  // 2) Public TMDB proxy (must NOT require auth)
  {
    const { res, body } = await getJson('/api/v1/tmdb/trending');
    check('GET /tmdb/trending -> 200 (public)', res.status === 200 && Array.isArray(body.data), {
      status: res.status,
    });
  }

  // 3) Request a magic link
  const email = `e2e_${Date.now()}@e2e.binger.test`;
  {
    const { res } = await getJson('/api/v1/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirect_uri: `${BASE_URL}/auth/callback` }),
    });
    check('POST /auth/magic-link -> 200', res.status === 200);
  }

  // 4) Read the token from logs and verify it
  let accessToken = '';
  let refreshToken = '';
  {
    let token: string | null = null;
    for (let i = 0; i < 10 && !token; i++) {
      token = readMagicToken(email);
      if (!token) await sleep(500);
    }
    check('magic-link token present in API logs', !!token);

    const res = await fetch(
      `${BASE_URL}/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token!)}&redirect_uri=${encodeURIComponent(
        `${BASE_URL}/auth/callback`
      )}`,
      { redirect: 'manual' }
    );
    const location = res.headers.get('location') ?? '';
    check('GET /auth/magic-link/verify -> 302 redirect', res.status === 302 || res.status === 303, res.status);
    const url = new URL(location);
    accessToken = url.searchParams.get('access_token') ?? '';
    refreshToken = url.searchParams.get('refresh_token') ?? '';
    check('verify redirect carries access + refresh tokens', !!accessToken && !!refreshToken);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 5) Authenticated /me
  {
    const { res, body } = await getJson('/api/v1/auth/me', { headers: authHeaders });
    check('GET /auth/me -> 200 with matching email', res.status === 200 && body.data?.email === email, body);
  }

  // 6) Watchlist CRUD
  {
    const add = await getJson('/api/v1/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ show_id: 1396 }),
    });
    check('POST /watchlist -> 200', add.res.status === 200);

    const list = await getJson('/api/v1/watchlist', { headers: authHeaders });
    const ids = (list.body.data ?? []).map((r: any) => Number(r.show_id));
    check('GET /watchlist contains added show', ids.includes(1396), ids);

    const del = await getJson('/api/v1/watchlist/1396', { method: 'DELETE', headers: authHeaders });
    check('DELETE /watchlist/:id -> 200', del.res.status === 200);
  }

  // 7) Rating upsert
  {
    const put = await getJson('/api/v1/ratings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ show_id: 1399, rating: 5 }),
    });
    check('PUT /ratings -> 200', put.res.status === 200);
  }

  // 8) Token refresh
  {
    const { res, body } = await getJson('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    check('POST /auth/refresh -> 200 with new tokens', res.status === 200 && !!body.data?.access_token, body);
  }

  console.log(`\n[e2e] ✅ all ${passed} checks passed\n`);
}

main().catch((err) => {
  console.error(`\n[e2e] ❌ ${err.message}\n`);
  process.exit(1);
});
