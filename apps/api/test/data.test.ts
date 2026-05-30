import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { resetDb } from './setup.js';
import { makeUser } from './helpers.js';

const app = createApp();

describe('data / CRUD routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/watchlist');
    expect(res.status).toBe(401);
  });

  it('adds, lists and removes a watchlist item', async () => {
    const { auth } = await makeUser();

    const add = await request(app).post('/api/v1/watchlist').set(auth).send({ show_id: 1396 });
    expect(add.status).toBe(200);

    const list = await request(app).get('/api/v1/watchlist').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((r: any) => Number(r.show_id))).toContain(1396);

    const del = await request(app).delete('/api/v1/watchlist/1396').set(auth);
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/v1/watchlist').set(auth);
    expect(after.body.data.length).toBe(0);
  });

  it('bulk-adds watchlist items', async () => {
    const { auth } = await makeUser();
    const res = await request(app).post('/api/v1/watchlist/bulk').set(auth).send({ show_ids: [1, 2, 3] });
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/v1/watchlist').set(auth);
    expect(list.body.data.length).toBe(3);
  });

  it('upserts a show rating', async () => {
    const { auth } = await makeUser();
    const put1 = await request(app).put('/api/v1/ratings').set(auth).send({ show_id: 1399, rating: 4 });
    expect(put1.status).toBe(200);

    const put2 = await request(app).put('/api/v1/ratings').set(auth).send({ show_id: 1399, rating: 5 });
    expect(put2.status).toBe(200);

    const get = await request(app).get('/api/v1/ratings/1399').set(auth);
    expect(get.status).toBe(200);
    expect(get.body.data?.rating ?? get.body.data).toBeTruthy();
  });

  it('rejects an out-of-range rating', async () => {
    const { auth } = await makeUser();
    const res = await request(app).put('/api/v1/ratings').set(auth).send({ show_id: 1, rating: 9 });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('follows and unfollows another user', async () => {
    const a = await makeUser();
    const b = await makeUser();

    const follow = await request(app).post(`/api/v1/follows/${b.user.id}`).set(a.auth);
    expect(follow.status).toBe(200);

    const check = await request(app).get(`/api/v1/follows/check/${b.user.id}`).set(a.auth);
    expect(check.status).toBe(200);
    expect(check.body.data.following).toBe(true);

    const unfollow = await request(app).delete(`/api/v1/follows/${b.user.id}`).set(a.auth);
    expect(unfollow.status).toBe(200);

    const check2 = await request(app).get(`/api/v1/follows/check/${b.user.id}`).set(a.auth);
    expect(check2.body.data.following).toBe(false);
  });

  it('awards XP and updates the profile', async () => {
    const { auth, user } = await makeUser();
    const res = await request(app).post('/api/v1/xp/award').set(auth).send({ action: 'watch_episode' });
    expect(res.status).toBe(200);

    const { rows } = await query('SELECT xp FROM profiles WHERE id = $1', [user.id]);
    expect(Number(rows[0].xp)).toBeGreaterThan(0);
  });

  it('patches the current user profile', async () => {
    const { auth, user } = await makeUser();
    const res = await request(app)
      .patch('/api/v1/profiles/me')
      .set(auth)
      .send({ full_name: 'Test User', bio: 'Hello bio', username: `user_${user.id.slice(0, 8)}` });
    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Test User');
    expect(res.body.data.bio).toBe('Hello bio');
  });

  it('posts a nested comment reply', async () => {
    const { auth } = await makeUser();
    const parent = await request(app)
      .post('/api/v1/comments')
      .set(auth)
      .send({ show_id: 1396, content: 'parent comment' });
    expect(parent.status).toBe(200);

    const parentId = Number(parent.body.data.id);
    const reply = await request(app)
      .post('/api/v1/comments')
      .set(auth)
      .send({ show_id: 1396, content: 'reply text', parent_id: parentId });
    expect(reply.status).toBe(200);
    expect(Number(reply.body.data.parent_id)).toBe(parentId);

    const list = await request(app).get('/api/v1/comments?show_id=1396').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: { id: number }) => c.id === reply.body.data.id)).toBe(true);
  });

  it('allows image-only comment (empty content)', async () => {
    const { auth } = await makeUser();
    const res = await request(app).post('/api/v1/comments').set(auth).send({ show_id: 99, content: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBeNull();
  });
});
