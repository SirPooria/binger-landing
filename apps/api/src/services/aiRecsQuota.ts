import { config } from '../config.js';
import { query } from '../db.js';

/** Calendar date (YYYY-MM-DD) in the configured AI batch timezone. */
export function aiQuotaCalendarToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.ai.batchTimezone }).format(new Date());
}

export async function getLastQuotaDate(userId: string): Promise<string | null> {
  const { rows } = await query<{ last_quota_date: string | null }>(
    `SELECT last_quota_date::text FROM ai_recs_user_state WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.last_quota_date ?? null;
}

export async function hasDailyQuotaRemaining(userId: string): Promise<boolean> {
  const last = await getLastQuotaDate(userId);
  if (!last) return true;
  return last < aiQuotaCalendarToday();
}

export async function markDailyQuotaUsed(userId: string): Promise<void> {
  const today = aiQuotaCalendarToday();
  await query(
    `UPDATE ai_recs_user_state SET last_quota_date = $2::date WHERE user_id = $1`,
    [userId, today]
  );
}
