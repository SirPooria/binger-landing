import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('tmdb proxy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('proxies search results from TMDB (with fetch mocked)', async () => {
    const fake = { results: [{ id: 999, name: 'Mock Show' }] };
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fake), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    // Unique query so the Redis cache always misses and the producer runs.
    const q = `mock-${Date.now()}`;
    const res = await request(app).get('/api/v1/tmdb/search').query({ q });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(fake.results);
    expect(spy).toHaveBeenCalled();
  });

  it('returns 502 when the TMDB upstream fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const q = `fail-${Date.now()}`;
    const res = await request(app).get('/api/v1/tmdb/search').query({ q });
    expect(res.status).toBe(502);
  });
});
