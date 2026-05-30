import { afterAll, beforeAll } from 'vitest';
import { pool, query } from '../src/db.js';
import { redis } from '../src/redis.js';

/** Wait until Postgres accepts connections (the test container may still be booting). */
async function waitForDb(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      await query('SELECT 1');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Postgres test database not reachable. Did you run: docker compose -f infra/docker-compose.test.yml up -d ?');
}

/** Truncate all user-owned data between tests. CASCADE from users covers profiles + content. */
export async function resetDb() {
  await query('TRUNCATE users, magic_link_tokens, oauth_states RESTART IDENTITY CASCADE');
}

beforeAll(async () => {
  await waitForDb();
  await resetDb();
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});
