import { query } from '../db.js';
import { redis } from '../redis.js';
import { AI_RECS_MIN_WATCHED_SHOWS } from '../constants/aiRecs.js';
import { getUserContextHash } from './aiContext.js';
import {
  buildContextText,
  computeContextHash,
  fetchWatchContextRows,
} from './aiContext.js';
import type { AiRecommendation } from './aiTypes.js';
import {
  callLLMForContext,
  hydrateRecommendations,
  persistRecommendationsForUser,
  setUserRecsRedis,
} from './aiGeneration.js';

type QueueStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type ProcessJobOutcome = 'cache' | 'llm' | 'failed';

export async function getCachedRecsByHash(contextHash: string): Promise<AiRecommendation[] | null> {
  const { rows } = await query<{ recs_json: AiRecommendation[] }>(
    `SELECT recs_json FROM ai_recs_context_cache WHERE context_hash = $1`,
    [contextHash]
  );
  const raw = rows[0]?.recs_json;
  if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
  return raw.filter((r) => typeof r.tmdb_id === 'number');
}

async function saveContextCache(contextHash: string, recs: AiRecommendation[]): Promise<void> {
  if (recs.length === 0) return;
  await query(
    `INSERT INTO ai_recs_context_cache (context_hash, recs_json)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (context_hash) DO UPDATE
       SET recs_json = EXCLUDED.recs_json, generated_at = now()`,
    [contextHash, JSON.stringify(recs)]
  );
}

async function upsertUserState(userId: string, contextHash: string): Promise<void> {
  await query(
    `INSERT INTO ai_recs_user_state (user_id, context_hash, last_ready_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE
       SET context_hash = EXCLUDED.context_hash, last_ready_at = now()`,
    [userId, contextHash]
  );
}

async function markQueue(userId: string, contextHash: string, status: QueueStatus): Promise<void> {
  await query(
    `INSERT INTO ai_recs_queue (user_id, context_hash, status, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, context_hash) DO UPDATE
       SET status = EXCLUDED.status, updated_at = now()`,
    [userId, contextHash, status]
  );
}

export async function userHasRecsForHash(userId: string, contextHash: string): Promise<boolean> {
  const { rows: state } = await query<{ context_hash: string }>(
    `SELECT context_hash FROM ai_recs_user_state WHERE user_id = $1`,
    [userId]
  );
  if (state[0]?.context_hash !== contextHash) return false;
  const { rows: recs } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM ai_recommendations WHERE user_id = $1`,
    [userId]
  );
  return Number(recs[0]?.n ?? 0) > 0;
}

export async function applyCachedRecsForUser(
  userId: string,
  contextHash: string,
  recs: AiRecommendation[]
): Promise<void> {
  await persistRecommendationsForUser(userId, recs);
  await upsertUserState(userId, contextHash);
  const hydrated = await hydrateRecommendations(recs);
  const withShow = hydrated.filter((r) => r.show != null).length;
  if (withShow > 0) {
    await setUserRecsRedis(userId, hydrated);
  }
  await markQueue(userId, contextHash, 'ready');
}

export async function isRecsProcessing(userId: string, contextHash: string): Promise<boolean> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM ai_recs_queue
      WHERE user_id = $1 AND context_hash = $2 AND status = 'processing'`,
    [userId, contextHash]
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

/** Runs one generation job. `llm` means Anthropic was called (counts toward daily quota). */
export async function processOneJob(userId: string, contextHash: string): Promise<ProcessJobOutcome> {
  const existing = await getCachedRecsByHash(contextHash);
  if (existing) {
    await applyCachedRecsForUser(userId, contextHash, existing);
    return 'cache';
  }

  await markQueue(userId, contextHash, 'processing');
  const rows = await fetchWatchContextRows(userId);
  if (computeContextHash(rows) !== contextHash) {
    await markQueue(userId, contextHash, 'failed');
    return 'failed';
  }

  const contextText = await buildContextText(rows);
  let recs: AiRecommendation[] = [];
  try {
    recs = await callLLMForContext(contextText);
  } catch (err) {
    console.error('[aiRecsQueue] LLM failed:', (err as Error).message);
    await markQueue(userId, contextHash, 'failed');
    return 'failed';
  }

  if (recs.length === 0) {
    await markQueue(userId, contextHash, 'failed');
    return 'failed';
  }

  await saveContextCache(contextHash, recs);
  await applyCachedRecsForUser(userId, contextHash, recs);
  return 'llm';
}

/** Drain stale pending jobs (optional nightly maintenance). */
export async function processAiRecsQueue(limit = 500): Promise<{ processed: number; failed: number }> {
  const { rows } = await query<{ user_id: string; context_hash: string }>(
    `SELECT user_id, context_hash FROM ai_recs_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit]
  );

  let processed = 0;
  let failed = 0;
  for (const job of rows) {
    try {
      const outcome = await processOneJob(job.user_id, job.context_hash);
      if (outcome === 'failed') failed++;
      else processed++;
    } catch (err) {
      failed++;
      console.error('[aiRecsQueue] job failed:', job.user_id, (err as Error).message);
      await markQueue(job.user_id, job.context_hash, 'failed').catch(() => {});
    }
  }
  return { processed, failed };
}

/** Nightly: finish any stuck pending jobs only (users generate on demand). */
export async function runDailyAiRecsBatch(): Promise<void> {
  const lockKey = 'ai:recs:batch:lock';
  const acquired = await redis.set(lockKey, '1', 'EX', 3600, 'NX').catch(() => null);
  if (!acquired) {
    console.log('[aiRecsBatch] skipped — another instance holds the lock');
    return;
  }

  try {
    const result = await processAiRecsQueue(10_000);
    console.log(`[aiRecsBatch] processed=${result.processed} failed=${result.failed}`);
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}
