import { AI_RECS_MIN_WATCHED_SHOWS } from '../constants/aiRecs.js';
import { redis } from '../redis.js';
import { getUserContextHash } from './aiContext.js';
import { countWatchedShows } from './aiRecsStatus.js';
import { hasDailyQuotaRemaining, markDailyQuotaUsed } from './aiRecsQuota.js';
import {
  applyCachedRecsForUser,
  getCachedRecsByHash,
  processOneJob,
  userHasRecsForHash,
} from './aiRecsQueue.js';
import { getRecommendationsForUser } from './ai.js';
import type { AiRecommendation } from './aiTypes.js';

export type GenerateAiRecsResult =
  | { ok: true; quotaUsed: boolean; data: (AiRecommendation & { show: unknown })[] }
  | { ok: false; error: 'not_eligible' | 'quota_exhausted' | 'processing' | 'generation_failed'; data: [] };

/** User-triggered generation (at most one LLM run per calendar day). */
export async function generateAiRecsForUser(userId: string): Promise<GenerateAiRecsResult> {
  const watched = await countWatchedShows(userId);
  if (watched < AI_RECS_MIN_WATCHED_SHOWS) {
    return { ok: false, error: 'not_eligible', data: [] };
  }

  const contextHash = await getUserContextHash(userId);

  if (await userHasRecsForHash(userId, contextHash)) {
    const data = await getRecommendationsForUser(userId);
    return { ok: true, quotaUsed: false, data };
  }

  const shared = await getCachedRecsByHash(contextHash);
  if (shared?.length) {
    await applyCachedRecsForUser(userId, contextHash, shared);
    const data = await getRecommendationsForUser(userId);
    return { ok: true, quotaUsed: false, data };
  }

  if (!(await hasDailyQuotaRemaining(userId))) {
    return { ok: false, error: 'quota_exhausted', data: [] };
  }

  const lockKey = `ai:recs:gen:${userId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 180, 'NX').catch(() => null);
  if (!acquired) {
    return { ok: false, error: 'processing', data: [] };
  }

  try {
    const outcome = await processOneJob(userId, contextHash);
    if (outcome === 'llm') {
      await markDailyQuotaUsed(userId);
    }
    if (outcome === 'failed') {
      return { ok: false, error: 'generation_failed', data: [] };
    }
    const data = await getRecommendationsForUser(userId);
    const hasShow = data.some((r) => r.show != null);
    if (!hasShow) {
      return { ok: false, error: 'generation_failed', data: [] };
    }
    return { ok: true, quotaUsed: outcome === 'llm', data };
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}
