-- Run on existing databases (init.sql only applies on first Postgres volume create).

CREATE TABLE IF NOT EXISTS ai_recs_context_cache (
  context_hash  CHAR(64) PRIMARY KEY,
  recs_json     JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_recs_user_state (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  context_hash    CHAR(64) NOT NULL,
  last_ready_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
