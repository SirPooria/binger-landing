import { query } from '../db.js';
import { redis } from '../redis.js';
import { AI_RECS_MIN_WATCHED_SHOWS } from '../constants/aiRecs.js';
import { countWatchedShows } from './aiRecsStatus.js';
import { getUserContextHash } from './aiContext.js';
import {
  applyCachedRecsForUser,
  getCachedRecsByHash,
  userHasRecsForHash,
} from './aiRecsQueue.js';
import { hydrateRecommendations, setUserRecsRedis } from './aiGeneration.js';

export type { AiRecommendation } from './aiTypes.js';
import type { AiRecommendation } from './aiTypes.js';

async function loadFromContextCache(
  contextHash: string
): Promise<AiRecommendation[] | null> {
  return getCachedRecsByHash(contextHash);
}

async function loadUserRecsFromDb(
  userId: string,
  contextHash: string
): Promise<AiRecommendation[]> {
  const { rows: state } = await query<{ context_hash: string }>(
    `SELECT context_hash FROM ai_recs_user_state WHERE user_id = $1`,
    [userId]
  );
  if (state[0]?.context_hash !== contextHash) return [];

  const { rows } = await query<{
    show_id: number;
    reason: string;
    score: number;
    based_on_show_id: number | null;
  }>(
    `SELECT show_id, reason, score, based_on_show_id
       FROM ai_recommendations
      WHERE user_id = $1
      ORDER BY score DESC`,
    [userId]
  );
  return rows.map((r) => ({
    tmdb_id: r.show_id,
    reason: r.reason,
    score: r.score,
    based_on_show_id: r.based_on_show_id ?? undefined,
  }));
}

/** Read cached recommendations only (no LLM). */
export async function getRecommendationsForUser(
  userId: string
): Promise<(AiRecommendation & { show: unknown })[]> {
  const watched = await countWatchedShows(userId);
  if (watched < AI_RECS_MIN_WATCHED_SHOWS) return [];

  const contextHash = await getUserContextHash(userId);
  const cacheKey = `ai:recs:${userId}`;

  const cachedRaw = await redis.get(cacheKey).catch(() => null);
  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw) as unknown[];
    if (Array.isArray(cached) && cached.length > 0) {
      const { rows: state } = await query<{ context_hash: string }>(
        `SELECT context_hash FROM ai_recs_user_state WHERE user_id = $1`,
        [userId]
      );
      if (state[0]?.context_hash === contextHash) {
        return cached as (AiRecommendation & { show: unknown })[];
      }
      await redis.del(cacheKey).catch(() => {});
    }
  }

  if (!(await userHasRecsForHash(userId, contextHash))) {
    const shared = await loadFromContextCache(contextHash);
    if (shared?.length) {
      await applyCachedRecsForUser(userId, contextHash, shared);
    }
  }

  let recs = await loadUserRecsFromDb(userId, contextHash);

  if (recs.length > 0) {
    const hydrated = await hydrateRecommendations(recs);
    const withShow = hydrated.filter((r) => r.show != null).length;
    if (withShow > 0) {
      await setUserRecsRedis(userId, hydrated);
      return hydrated;
    }
  }

  return [];
}
