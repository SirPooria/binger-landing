import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const dataRouter = Router();
dataRouter.use(requireAuth);

const uid = (req: { user?: { id: string } }) => req.user!.id;

// ── Watchlist ─────────────────────────────────────────────────
dataRouter.get('/watchlist', async (req, res) => {
  const { rows } = await query('SELECT show_id, created_at FROM watchlist WHERE user_id = $1 ORDER BY created_at DESC', [uid(req)]);
  res.json({ data: rows });
});

dataRouter.post('/watchlist', async (req, res) => {
  const { show_id } = z.object({ show_id: z.number() }).parse(req.body);
  await query(
    `INSERT INTO watchlist (user_id, show_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [uid(req), show_id]
  );
  res.json({ data: { ok: true } });
});

dataRouter.delete('/watchlist/:showId', async (req, res) => {
  await query('DELETE FROM watchlist WHERE user_id = $1 AND show_id = $2', [uid(req), Number(req.params.showId)]);
  res.json({ data: { ok: true } });
});

dataRouter.post('/watchlist/bulk', async (req, res) => {
  const { show_ids } = z.object({ show_ids: z.array(z.number()) }).parse(req.body);
  for (const show_id of show_ids) {
    await query(`INSERT INTO watchlist (user_id, show_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [uid(req), show_id]);
  }
  res.json({ data: { ok: true } });
});

// ── Watched ───────────────────────────────────────────────────
dataRouter.post('/watched', async (req, res) => {
  const body = z.object({ show_id: z.number(), episode_id: z.number().optional() }).parse(req.body);
  const { rows } = await query(
    `INSERT INTO watched (user_id, show_id, episode_id) VALUES ($1, $2, $3) RETURNING *`,
    [uid(req), body.show_id, body.episode_id ?? null]
  );
  res.json({ data: rows[0] });
});

// ── Favorites ─────────────────────────────────────────────────
dataRouter.post('/favorites', async (req, res) => {
  const { show_id } = z.object({ show_id: z.number() }).parse(req.body);
  await query(`INSERT INTO favorites (user_id, show_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [uid(req), show_id]);
  res.json({ data: { ok: true } });
});

// ── Ratings ─────────────────────────────────────────────────────
dataRouter.get('/ratings/:showId', async (req, res) => {
  const { rows } = await query('SELECT rating FROM show_ratings WHERE user_id = $1 AND show_id = $2', [
    uid(req),
    Number(req.params.showId),
  ]);
  res.json({ data: rows[0] ?? null });
});

dataRouter.put('/ratings', async (req, res) => {
  const body = z.object({ show_id: z.number(), rating: z.number().min(1).max(5) }).parse(req.body);
  await query(
    `INSERT INTO show_ratings (user_id, show_id, rating) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, show_id) DO UPDATE SET rating = EXCLUDED.rating`,
    [uid(req), body.show_id, body.rating]
  );
  res.json({ data: { ok: true } });
});

// ── Episode reactions ─────────────────────────────────────────
dataRouter.post('/episode-reactions', async (req, res) => {
  const body = z.object({ episode_id: z.number(), reaction: z.string() }).parse(req.body);
  await query(
    `INSERT INTO episode_reactions (user_id, episode_id, reaction) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, episode_id, reaction) DO NOTHING`,
    [uid(req), body.episode_id, body.reaction]
  );
  res.json({ data: { ok: true } });
});

// ── Profile (current user) ────────────────────────────────────
dataRouter.patch('/profiles/me', async (req, res) => {
  const body = z
    .object({
      full_name: z.string().max(120).optional(),
      username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/)
        .optional(),
      bio: z.string().max(500).optional(),
      avatar_url: z.string().url().optional(),
    })
    .parse(req.body);

  if (body.username) {
    const clash = await query('SELECT id FROM profiles WHERE lower(username) = lower($1) AND id <> $2', [
      body.username,
      uid(req),
    ]);
    if (clash.rows.length) return res.status(409).json({ error: 'username_taken', message: 'این نام کاربری قبلاً استفاده شده.' });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, val] of Object.entries(body) as [string, string | undefined][]) {
    if (val === undefined) continue;
    fields.push(`${key} = $${i++}`);
    values.push(val);
  }
  if (fields.length === 0) {
    const { rows } = await query('SELECT * FROM profiles WHERE id = $1', [uid(req)]);
    return res.json({ data: rows[0] ?? null });
  }
  fields.push(`updated_at = now()`);
  values.push(uid(req));
  const { rows } = await query(
    `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (body.avatar_url || body.full_name) {
    await query(
      `UPDATE users SET
         avatar_url = COALESCE($2, avatar_url),
         full_name = COALESCE($3, full_name)
       WHERE id = $1`,
      [uid(req), body.avatar_url ?? null, body.full_name ?? null]
    );
  }
  res.json({ data: rows[0] ?? null });
});

// ── Profile stats ─────────────────────────────────────────────
dataRouter.get('/profiles/:id/stats', async (req, res) => {
  const id = req.params.id;
  const [profile, watched, following, followers, badges, favorites] = await Promise.all([
    query('SELECT * FROM profiles WHERE id = $1', [id]),
    query('SELECT COUNT(*)::int AS c FROM watched WHERE user_id = $1', [id]),
    query('SELECT COUNT(*)::int AS c FROM follows WHERE follower_id = $1', [id]),
    query('SELECT COUNT(*)::int AS c FROM follows WHERE following_id = $1', [id]),
    query('SELECT badge_id FROM user_badges WHERE user_id = $1', [id]),
    query('SELECT show_id FROM favorites WHERE user_id = $1 LIMIT 20', [id]),
  ]);
  const u = await query<{ onboarding_complete: boolean; email: string }>('SELECT onboarding_complete, email FROM users WHERE id = $1', [id]);
  res.json({
    data: {
      profile: { ...profile.rows[0], ...u.rows[0] },
      watchedCount: watched.rows[0]?.c ?? 0,
      followingCount: following.rows[0]?.c ?? 0,
      followersCount: followers.rows[0]?.c ?? 0,
      badges: badges.rows.map((b: any) => b.badge_id),
      favoriteShowIds: favorites.rows.map((f: any) => f.show_id),
    },
  });
});

// ── Follows ─────────────────────────────────────────────────────
dataRouter.get('/follows/check/:targetId', async (req, res) => {
  const { rows } = await query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
    [uid(req), req.params.targetId]
  );
  res.json({ data: { following: rows.length > 0 } });
});

dataRouter.post('/follows/:targetId', async (req, res) => {
  await query(
    `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [uid(req), req.params.targetId]
  );
  res.json({ data: { ok: true } });
});

dataRouter.delete('/follows/:targetId', async (req, res) => {
  await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [uid(req), req.params.targetId]);
  res.json({ data: { ok: true } });
});

dataRouter.get('/follows/following-ids', async (req, res) => {
  const { rows } = await query('SELECT following_id FROM follows WHERE follower_id = $1', [uid(req)]);
  res.json({ data: rows.map((r: any) => r.following_id) });
});

// ── Comments ──────────────────────────────────────────────────
function serializeCommentRow(row: Record<string, unknown>) {
  return {
    ...row,
    id: Number(row.id),
    show_id: row.show_id != null ? Number(row.show_id) : null,
    episode_id: row.episode_id != null ? Number(row.episode_id) : null,
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
  };
}

dataRouter.get('/comments', asyncHandler(async (req, res) => {
  const showId = req.query.show_id ? Number(req.query.show_id) : null;
  const episodeId = req.query.episode_id ? Number(req.query.episode_id) : null;
  let sql = `
    SELECT c.*, json_build_object('username', p.username, 'avatar_url', p.avatar_url) AS profiles,
           COALESCE((SELECT json_agg(json_build_object('id', cm.id, 'media_type', cm.media_type, 'url', cm.url, 'thumbnail_url', cm.thumbnail_url))
             FROM comment_media cm WHERE cm.comment_id = c.id), '[]') AS comment_media,
           COALESCE((SELECT json_agg(json_build_object('reaction', cr.reaction, 'user_id', cr.user_id))
             FROM comment_reactions cr WHERE cr.comment_id = c.id), '[]') AS comment_reactions
    FROM comments c
    JOIN profiles p ON p.id = c.user_id
    WHERE 1=1`;
  const params: unknown[] = [];
  if (episodeId) {
    params.push(episodeId);
    sql += ` AND c.episode_id = $${params.length}`;
  } else if (showId) {
    params.push(showId);
    sql += ` AND c.show_id = $${params.length}`;
  }
  sql += ' ORDER BY c.created_at DESC';
  const { rows } = await query(sql, params);
  res.json({ data: rows.map((r) => serializeCommentRow(r as Record<string, unknown>)) });
}));

dataRouter.post('/comments', asyncHandler(async (req, res) => {
  const body = z
    .object({
      show_id: z.coerce.number().optional(),
      episode_id: z.coerce.number().optional(),
      content: z.string().optional(),
      parent_id: z.coerce.number().optional(),
    })
    .parse(req.body);
  const content = (body.content ?? '').trim();
  const { rows } = await query(
    `INSERT INTO comments (user_id, show_id, episode_id, content, parent_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [uid(req), body.show_id ?? null, body.episode_id ?? null, content || null, body.parent_id ?? null]
  );
  res.json({ data: serializeCommentRow(rows[0] as Record<string, unknown>) });
}));

dataRouter.post('/comments/:id/media', async (req, res) => {
  const body = z
    .object({
      media_type: z.string(),
      url: z.string(),
      thumbnail_url: z.string().optional(),
      show_id: z.number().optional(),
      episode_id: z.number().optional(),
    })
    .parse(req.body);
  await query(
    `INSERT INTO comment_media (comment_id, media_type, url, thumbnail_url, show_id, episode_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [req.params.id, body.media_type, body.url, body.thumbnail_url ?? null, body.show_id ?? null, body.episode_id ?? null]
  );
  res.json({ data: { ok: true } });
});

dataRouter.post('/comments/:id/reactions', async (req, res) => {
  const { reaction, active } = z.object({ reaction: z.string(), active: z.boolean() }).parse(req.body);
  if (active) {
    await query('DELETE FROM comment_reactions WHERE user_id=$1 AND comment_id=$2 AND reaction=$3', [
      uid(req),
      req.params.id,
      reaction,
    ]);
  } else {
    await query(
      `INSERT INTO comment_reactions (user_id, comment_id, reaction) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [uid(req), req.params.id, reaction]
    );
  }
  res.json({ data: { ok: true } });
});

dataRouter.get('/episode-screenshots', async (req, res) => {
  const showId = Number(req.query.show_id);
  const { rows } = await query('SELECT * FROM episode_screenshots WHERE show_id = $1 LIMIT 30', [showId]);
  res.json({ data: rows });
});

// ── XP ────────────────────────────────────────────────────────
dataRouter.post('/xp/award', async (req, res) => {
  try {
    const body = z.object({ action: z.string(), reference_id: z.string().optional() }).parse(req.body);
    const amounts: Record<string, number> = {
      watch_episode: 10,
      rate_show: 20,
      comment: 15,
      comment_liked: 5,
      follow: 10,
      followed: 25,
      badge_earned: 100,
      create_theory: 30,
      forum_post: 20,
    };
    const amount = amounts[body.action] ?? 0;
    const { rows } = await query(`SELECT * FROM award_xp($1, $2, $3, $4)`, [
      uid(req),
      amount,
      body.action,
      body.reference_id ?? null,
    ]);
    res.json({ data: rows[0] ?? null });
  } catch (e) {
    console.error('[xp/award]', e);
    res.status(500).json({ error: 'xp_award_failed', message: 'امتیاز ثبت نشد.' });
  }
});

// ── Stories ───────────────────────────────────────────────────
dataRouter.get('/stories', async (_req, res) => {
  const { rows } = await query(
    `SELECT s.*, json_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.expires_at > now() ORDER BY s.created_at DESC`
  );
  res.json({ data: rows });
});

dataRouter.post('/stories', async (req, res) => {
  const body = z
    .object({
      show_id: z.number().optional(),
      episode_id: z.number().optional(),
      content_type: z.string(),
      image_url: z.string().optional(),
      text_overlay: z.string().optional(),
    })
    .parse(req.body);
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO stories (user_id, show_id, episode_id, content_type, image_url, text_overlay, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uid(req), body.show_id ?? null, body.episode_id ?? null, body.content_type, body.image_url ?? null, body.text_overlay ?? null, expires_at]
  );
  res.json({ data: { ok: true } });
});

dataRouter.post('/stories/:id/view', async (req, res) => {
  await query(
    `INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.params.id, uid(req)]
  );
  await query('UPDATE stories SET views_count = views_count + 1 WHERE id = $1', [req.params.id]);
  res.json({ data: { ok: true } });
});

// ── Social feed ───────────────────────────────────────────────
dataRouter.get('/feed', async (req, res) => {
  const userId = uid(req);
  const { rows: follows } = await query('SELECT following_id FROM follows WHERE follower_id = $1', [userId]);
  const ids = follows.map((f: any) => f.following_id);
  if (ids.length === 0) return res.json({ data: [] });

  const limit = 40;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const feed: any[] = [];

  const [watched, ratings, lists, comments, badges] = await Promise.all([
    query(
      `SELECT w.id, w.user_id, w.show_id, w.created_at, p.username, p.avatar_url
       FROM watched w JOIN profiles p ON p.id = w.user_id
       WHERE w.user_id IN (${placeholders}) ORDER BY w.created_at DESC LIMIT ${limit}`,
      ids
    ),
    query(
      `SELECT r.user_id, r.show_id, r.rating, r.created_at, p.username, p.avatar_url
       FROM show_ratings r JOIN profiles p ON p.id = r.user_id
       WHERE r.user_id IN (${placeholders}) ORDER BY r.created_at DESC LIMIT ${limit}`,
      ids
    ),
    query(
      `SELECT wl.user_id, wl.show_id, wl.created_at, p.username, p.avatar_url
       FROM watchlist wl JOIN profiles p ON p.id = wl.user_id
       WHERE wl.user_id IN (${placeholders}) ORDER BY wl.created_at DESC LIMIT ${limit}`,
      ids
    ),
    query(
      `SELECT c.id, c.user_id, c.show_id, c.content, c.created_at, p.username, p.avatar_url
       FROM comments c JOIN profiles p ON p.id = c.user_id
       WHERE c.user_id IN (${placeholders}) ORDER BY c.created_at DESC LIMIT ${limit}`,
      ids
    ),
    query(
      `SELECT b.user_id, b.badge_id, b.earned_at, p.username, p.avatar_url
       FROM user_badges b JOIN profiles p ON p.id = b.user_id
       WHERE b.user_id IN (${placeholders}) ORDER BY b.earned_at DESC LIMIT ${limit}`,
      ids
    ),
  ]);

  watched.rows.forEach((r: any) =>
    feed.push({
      id: `w${r.id}`,
      type: 'watchedEpisode',
      user: { id: r.user_id, username: r.username, avatar_url: r.avatar_url },
      show_id: r.show_id,
      text: '✅ یک قسمت جدید دید',
      created_at: r.created_at,
    })
  );
  ratings.rows.forEach((r: any) =>
    feed.push({
      id: `r${r.user_id}-${r.show_id}`,
      type: 'rating',
      user: { id: r.user_id, username: r.username, avatar_url: r.avatar_url },
      show_id: r.show_id,
      text: `⭐ امتیاز ${r.rating}/۵ داد`,
      created_at: r.created_at,
    })
  );
  lists.rows.forEach((r: any) =>
    feed.push({
      id: `l${r.user_id}-${r.show_id}`,
      type: 'addedToList',
      user: { id: r.user_id, username: r.username, avatar_url: r.avatar_url },
      show_id: r.show_id,
      text: '📋 به لیست تماشا اضافه کرد',
      created_at: r.created_at,
    })
  );
  comments.rows.forEach((r: any) =>
    feed.push({
      id: `c${r.id}`,
      type: 'comment',
      user: { id: r.user_id, username: r.username, avatar_url: r.avatar_url },
      show_id: r.show_id,
      text: `💬 نظر داد: ${(r.content ?? '').slice(0, 60)}`,
      created_at: r.created_at,
    })
  );
  badges.rows.forEach((r: any) =>
    feed.push({
      id: `b${r.user_id}-${r.badge_id}`,
      type: 'badge',
      user: { id: r.user_id, username: r.username, avatar_url: r.avatar_url },
      text: `🎯 بج جدید گرفت: ${r.badge_id}`,
      created_at: r.earned_at,
    })
  );

  feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ data: feed.slice(0, limit) });
});

// ── Notifications ─────────────────────────────────────────────
dataRouter.get('/notifications', async (req, res) => {
  const { rows } = await query(
    `SELECT n.*, json_build_object('username', p.username, 'avatar_url', p.avatar_url) AS sender
     FROM notifications n LEFT JOIN profiles p ON p.id = n.sender_id
     WHERE n.recipient_id = $1 ORDER BY n.created_at DESC LIMIT 50`,
    [uid(req)]
  );
  res.json({ data: rows });
});

dataRouter.post('/notifications/read-all', async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false', [uid(req)]);
  res.json({ data: { ok: true } });
});

// ── User lists ────────────────────────────────────────────────
dataRouter.get('/user-lists', async (req, res) => {
  const { rows } = await query(
    `SELECT ul.*, (SELECT COUNT(*)::int FROM user_list_items WHERE list_id = ul.id) AS item_count
     FROM user_lists ul WHERE ul.user_id = $1 ORDER BY ul.created_at DESC`,
    [uid(req)]
  );
  res.json({ data: rows });
});

dataRouter.post('/user-lists', async (req, res) => {
  const body = z.object({ title: z.string(), description: z.string().optional(), is_public: z.boolean().optional() }).parse(req.body);
  const { rows } = await query(
    `INSERT INTO user_lists (user_id, title, description, is_public) VALUES ($1,$2,$3,$4) RETURNING *`,
    [uid(req), body.title, body.description ?? null, body.is_public ?? true]
  );
  res.json({ data: rows[0] });
});

dataRouter.get('/user-lists/:id/items', async (req, res) => {
  const { rows } = await query('SELECT show_id FROM user_list_items WHERE list_id = $1 ORDER BY sort_order', [req.params.id]);
  res.json({ data: rows.map((r: any) => r.show_id) });
});

dataRouter.post('/user-lists/:id/items', async (req, res) => {
  const { show_id, note } = z.object({ show_id: z.number(), note: z.string().optional() }).parse(req.body);
  await query(
    `INSERT INTO user_list_items (list_id, show_id, note) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [req.params.id, show_id, note ?? null]
  );
  res.json({ data: { ok: true } });
});

// ── Forums ────────────────────────────────────────────────────
dataRouter.get('/forums', async (req, res) => {
  const showId = Number(req.query.show_id);
  const category = req.query.category ? String(req.query.category) : null;
  const sort = String(req.query.sort ?? 'newest');
  let sql = `SELECT f.*, json_build_object('username', p.username, 'avatar_url', p.avatar_url) AS profiles
             FROM forums f LEFT JOIN profiles p ON p.id = f.user_id WHERE f.show_id = $1`;
  const params: unknown[] = [showId];
  if (category) {
    params.push(category);
    sql += ` AND f.category = $${params.length}`;
  }
  if (sort === 'popular') sql += ' ORDER BY f.likes_count DESC';
  else if (sort === 'hot') sql += ' ORDER BY f.replies_count DESC, f.created_at DESC';
  else sql += ' ORDER BY f.is_pinned DESC, f.created_at DESC';
  const { rows } = await query(sql, params);
  res.json({ data: rows });
});

dataRouter.get('/forums/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT f.*, json_build_object('username', p.username, 'avatar_url', p.avatar_url) AS profiles
     FROM forums f LEFT JOIN profiles p ON p.id = f.user_id WHERE f.id = $1`,
    [req.params.id]
  );
  res.json({ data: rows[0] ?? null });
});

dataRouter.post('/forums', async (req, res) => {
  const body = z
    .object({
      show_id: z.number(),
      category: z.string(),
      title: z.string(),
      body: z.string(),
      is_spoiler: z.boolean().optional(),
    })
    .parse(req.body);
  const { rows } = await query(
    `INSERT INTO forums (user_id, show_id, category, title, body, is_spoiler) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uid(req), body.show_id, body.category, body.title, body.body, body.is_spoiler ?? false]
  );
  res.json({ data: rows[0] });
});

dataRouter.get('/forums/:id/replies', async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, json_build_object('username', p.username, 'avatar_url', p.avatar_url) AS profiles
     FROM forum_replies r LEFT JOIN profiles p ON p.id = r.user_id
     WHERE r.forum_id = $1 ORDER BY r.created_at ASC`,
    [req.params.id]
  );
  res.json({ data: rows });
});

dataRouter.post('/forums/:id/replies', async (req, res) => {
  const { body: text } = z.object({ body: z.string() }).parse(req.body);
  await query(`INSERT INTO forum_replies (forum_id, user_id, body) VALUES ($1,$2,$3)`, [req.params.id, uid(req), text]);
  await query('UPDATE forums SET replies_count = replies_count + 1 WHERE id = $1', [req.params.id]);
  res.json({ data: { ok: true } });
});

// ── Groups & channels ─────────────────────────────────────────
dataRouter.get('/groups', async (_req, res) => {
  const { rows } = await query('SELECT * FROM groups WHERE is_public = true ORDER BY members_count DESC LIMIT 50');
  res.json({ data: rows });
});

dataRouter.get('/groups/my-ids', async (req, res) => {
  const { rows } = await query('SELECT group_id FROM group_members WHERE user_id = $1', [uid(req)]);
  res.json({ data: rows.map((r: any) => r.group_id) });
});

dataRouter.post('/groups/:id/join', async (req, res) => {
  await query(`INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, uid(req)]);
  res.json({ data: { ok: true } });
});

dataRouter.get('/channels', async (_req, res) => {
  const { rows } = await query('SELECT * FROM channels ORDER BY subscribers_count DESC LIMIT 50');
  res.json({ data: rows });
});

dataRouter.get('/channels/my-ids', async (req, res) => {
  const { rows } = await query('SELECT channel_id FROM channel_subscribers WHERE user_id = $1', [uid(req)]);
  res.json({ data: rows.map((r: any) => r.channel_id) });
});

dataRouter.post('/channels/:id/subscribe', async (req, res) => {
  await query(`INSERT INTO channel_subscribers (channel_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
    req.params.id,
    uid(req),
  ]);
  res.json({ data: { ok: true } });
});
