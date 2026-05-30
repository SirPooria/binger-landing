-- ============================================================================
-- BINGER — Self-hosted PostgreSQL schema
-- Runs automatically on first container start (docker-entrypoint-initdb.d).
-- Mirrors the original Supabase schema + adds the new feature tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram search on text

-- ────────────────────────────────────────────────────────────────────────────
-- AUTH — self-hosted replacement for Supabase auth.users
-- (When running against Supabase, this maps to auth.users instead.)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- EXISTING TABLES (preserved)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_at  TIMESTAMPTZ,
  username    TEXT UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  website     TEXT,
  -- Gamification (Phase 5.7)
  xp          INT DEFAULT 0,
  level       INT DEFAULT 1,
  xp_history  JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS watched (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  episode_id  BIGINT
);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, show_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  UNIQUE (user_id, show_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  follower_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  follower_email  TEXT,
  following_email TEXT,
  UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT,
  episode_id  BIGINT,
  content     TEXT,
  email       TEXT,
  parent_id   BIGINT REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_likes (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id  BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS show_ratings (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, show_id)
);

CREATE TABLE IF NOT EXISTS poll_votes (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  tag         TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, show_id, tag)
);

CREATE TABLE IF NOT EXISTS episode_reactions (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id  BIGINT NOT NULL,
  reaction    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id, reaction)
);

CREATE TABLE IF NOT EXISTS episode_votes (
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id   BIGINT NOT NULL,
  actor_id     BIGINT NOT NULL,
  actor_name   TEXT,
  actor_image  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id, actor_id)
);

CREATE TABLE IF NOT EXISTS episode_sources (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  episode_id  BIGINT NOT NULL,
  source      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id, source)
);

CREATE TABLE IF NOT EXISTS theories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_spoiler  BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    TEXT NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- NEW TABLES (Phase 5 features)
-- ════════════════════════════════════════════════════════════════════════════

-- Rich media attachments on comments (5.2) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id    BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  media_type    TEXT NOT NULL,   -- 'image', 'gif', 'episode_screenshot', 'meme'
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  episode_id    BIGINT,
  show_id       BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Comment reactions (5.2) — beyond simple likes ─────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reactions (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id  BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL,   -- ❤️ 😂 😭 🔥 👏 😤
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, comment_id, reaction)
);

-- Stories (5.3) ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  show_id       BIGINT,
  episode_id    BIGINT,
  content_type  TEXT NOT NULL,  -- 'watchedEpisode','addedToList','rating','custom'
  image_url     TEXT,
  text_overlay  TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  views_count   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id    UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

-- Forums (5.5) ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forums (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id       BIGINT NOT NULL,
  category      TEXT NOT NULL,  -- 'general','theories','episode','cast'
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  user_id       UUID REFERENCES profiles(id),
  is_pinned     BOOLEAN DEFAULT false,
  is_spoiler    BOOLEAN DEFAULT false,
  views_count   INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  likes_count   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id        UUID REFERENCES forums(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id),
  body            TEXT NOT NULL,
  parent_reply_id UUID REFERENCES forum_replies(id),
  likes_count     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Groups (5.6) ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  avatar_url    TEXT,
  cover_url     TEXT,
  show_id       BIGINT,
  genre         TEXT,
  is_public     BOOLEAN DEFAULT true,
  members_count INT DEFAULT 0,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member',  -- 'admin','moderator','member'
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES profiles(id),
  content        TEXT NOT NULL,
  media_urls     TEXT[],
  likes_count    INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Channels (5.6) ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  avatar_url        TEXT,
  owner_id          UUID REFERENCES profiles(id),
  subscribers_count INT DEFAULT 0,
  is_verified       BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_subscribers (
  channel_id    UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id       UUID REFERENCES channels(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  media_urls       TEXT[],
  show_id          BIGINT,
  episode_id       BIGINT,
  post_type        TEXT DEFAULT 'update',  -- 'news','update','trailer','review'
  reactions_count  JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- AI Recommendations cache (5.1) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  show_id         BIGINT NOT NULL,
  score           FLOAT NOT NULL,
  reason          TEXT,
  based_on_show_id BIGINT,
  generated_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, show_id)
);

-- Shared LLM output by watch-history fingerprint (no user-supplied prompts).
CREATE TABLE IF NOT EXISTS ai_recs_context_cache (
  context_hash  CHAR(64) PRIMARY KEY,
  recs_json     JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_recs_user_state (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  context_hash    CHAR(64) NOT NULL,
  last_ready_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_quota_date DATE
);

CREATE TABLE IF NOT EXISTS ai_recs_queue (
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context_hash  CHAR(64) NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, context_hash)
);
CREATE INDEX IF NOT EXISTS idx_ai_recs_queue_pending ON ai_recs_queue (status, created_at)
  WHERE status = 'pending';

-- Mood chat fallbacks (unmatched queries) for tuning — no PII beyond user_id.
CREATE TABLE IF NOT EXISTS ai_mood_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query_text  TEXT NOT NULL,
  match_kind  TEXT DEFAULT 'fallback',
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_mood_logs_user ON ai_mood_logs(user_id);

-- Custom lists (5.8) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  is_public     BOOLEAN DEFAULT true,
  cover_show_id BIGINT,
  likes_count   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_list_items (
  list_id     UUID REFERENCES user_lists(id) ON DELETE CASCADE,
  show_id     BIGINT NOT NULL,
  added_at    TIMESTAMPTZ DEFAULT now(),
  note        TEXT,
  sort_order  INT,
  PRIMARY KEY (list_id, show_id)
);

CREATE TABLE IF NOT EXISTS user_list_likes (
  list_id     UUID REFERENCES user_lists(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

-- Notifications (5.9) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id      UUID REFERENCES profiles(id),
  type           TEXT NOT NULL,  -- 'new_follower','comment_reply','like','badge_earned','new_episode','story_view','group_invite'
  reference_type TEXT,           -- 'show','episode','comment','forum','group','channel'
  reference_id   TEXT,
  message        TEXT NOT NULL,
  is_read        BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Episode screenshots / meme library (5.2) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS episode_screenshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id       BIGINT NOT NULL,
  episode_id    BIGINT,
  season_number INT,
  episode_number INT,
  image_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  caption       TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- XP transaction log (5.7) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  action      TEXT NOT NULL,  -- 'watch_episode','rate_show','comment', ...
  reference_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES (foreign keys + hot query paths)
-- ════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_watched_user        ON watched(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_show        ON watched(show_id);
CREATE INDEX IF NOT EXISTS idx_watched_created      ON watched(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user      ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user      ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower    ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following   ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_comments_show       ON comments(show_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode    ON comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_comments_user       ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent     ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_media_comment ON comment_media(comment_id);
CREATE INDEX IF NOT EXISTS idx_show_ratings_show   ON show_ratings(show_id);
CREATE INDEX IF NOT EXISTS idx_theories_show       ON theories(show_id);
CREATE INDEX IF NOT EXISTS idx_stories_user        ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires     ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_forums_show         ON forums(show_id);
CREATE INDEX IF NOT EXISTS idx_forums_category     ON forums(show_id, category);
CREATE INDEX IF NOT EXISTS idx_forum_replies_forum ON forum_replies(forum_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group   ON group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel ON channel_posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recs_user        ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lists_user     ON user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_screenshots_show ON episode_screenshots(show_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user          ON user_xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);

-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

-- Leaderboard: score = watched episodes + 5×ratings + 10×badges (recreated for self-host)
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (user_id UUID, email TEXT, username TEXT, avatar_url TEXT, score BIGINT) AS $$
  SELECT p.id AS user_id,
         u.email,
         p.username,
         p.avatar_url,
         (COALESCE(w.cnt, 0) + COALESCE(r.cnt, 0) * 5 + COALESCE(b.cnt, 0) * 10)::BIGINT AS score
    FROM profiles p
    JOIN users u ON u.id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM watched      GROUP BY user_id) w ON w.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM show_ratings GROUP BY user_id) r ON r.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM user_badges  GROUP BY user_id) b ON b.user_id = p.id
   ORDER BY score DESC
   LIMIT 100;
$$ LANGUAGE sql STABLE;

-- Scores for a specific set of users (used by friends leaderboard)
CREATE OR REPLACE FUNCTION get_scores_for_users(user_ids UUID[])
RETURNS TABLE (user_id UUID, email TEXT, score BIGINT) AS $$
  SELECT p.id, u.email,
         (COALESCE(w.cnt,0) + COALESCE(r.cnt,0)*5 + COALESCE(b.cnt,0)*10)::BIGINT
    FROM profiles p
    JOIN users u ON u.id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM watched      GROUP BY user_id) w ON w.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM show_ratings GROUP BY user_id) r ON r.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM user_badges  GROUP BY user_id) b ON b.user_id = p.id
   WHERE p.id = ANY(user_ids);
$$ LANGUAGE sql STABLE;

-- Compute level from XP (mirrors packages/shared level thresholds)
CREATE OR REPLACE FUNCTION level_for_xp(xp_amount INT)
RETURNS INT AS $$
  SELECT CASE
    WHEN xp_amount >= 15000 THEN 6
    WHEN xp_amount >= 7000  THEN 5
    WHEN xp_amount >= 3500  THEN 4
    WHEN xp_amount >= 1500  THEN 3
    WHEN xp_amount >= 500   THEN 2
    ELSE 1
  END;
$$ LANGUAGE sql IMMUTABLE;

-- Award XP atomically + log transaction + recompute level.
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_amount INT, p_action TEXT, p_reference TEXT DEFAULT NULL)
RETURNS TABLE (new_xp INT, new_level INT, leveled_up BOOLEAN) AS $$
DECLARE
  old_level INT;
  updated_xp INT;
  updated_level INT;
BEGIN
  SELECT level INTO old_level FROM profiles WHERE id = p_user_id;

  UPDATE profiles
     SET xp = xp + p_amount,
         level = level_for_xp(xp + p_amount)
   WHERE id = p_user_id
   RETURNING xp, level INTO updated_xp, updated_level;

  INSERT INTO user_xp_transactions (user_id, amount, action, reference_id)
  VALUES (p_user_id, p_amount, p_action, p_reference);

  RETURN QUERY SELECT updated_xp, updated_level, (updated_level > old_level);
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS — auto-create profile on user insert
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Self-hosted Postgres doesn't carry Supabase's auth.uid(). We expose a
-- helper that reads a per-connection GUC `app.current_user_id` which the API
-- gateway sets after verifying the Supabase JWT. Policies key off that.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_app_user() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Enable RLS on user-owned write tables.
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched             ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE theories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE forums              ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Public read for content tables; owner-only writes.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','watched','favorites','follows','comments','show_ratings','theories','forums','forum_replies','groups','group_posts','user_lists','user_list_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON %I;', t, t);
    EXECUTE format('CREATE POLICY %I_read ON %I FOR SELECT USING (true);', t, t);
  END LOOP;
END $$;

-- Owner write policies for the most sensitive user-owned tables.
DROP POLICY IF EXISTS watched_write ON watched;
CREATE POLICY watched_write ON watched FOR ALL
  USING (user_id = current_app_user()) WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS watchlist_all ON watchlist;
CREATE POLICY watchlist_all ON watchlist FOR ALL
  USING (user_id = current_app_user()) WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS favorites_write ON favorites;
CREATE POLICY favorites_write ON favorites FOR ALL
  USING (user_id = current_app_user()) WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS comments_write ON comments;
CREATE POLICY comments_write ON comments FOR ALL
  USING (user_id = current_app_user()) WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS notifications_owner ON notifications;
CREATE POLICY notifications_owner ON notifications FOR ALL
  USING (recipient_id = current_app_user()) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- SEED — an official Binger channel (idempotent)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO channels (name, description, is_verified)
VALUES ('Binger Official', 'کانال رسمی بینجر — اخبار، تریلرها و لیست‌های منتخب', true)
ON CONFLICT (name) DO NOTHING;
