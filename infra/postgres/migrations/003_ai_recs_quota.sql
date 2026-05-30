ALTER TABLE ai_recs_user_state
  ADD COLUMN IF NOT EXISTS last_quota_date DATE;
