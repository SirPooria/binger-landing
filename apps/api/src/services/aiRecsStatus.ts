import {
  AI_RECS_HOW_TO_WATCH_FA,
  AI_RECS_MIN_WATCHED_SHOWS,
  type AiRecsStatus,
} from '../constants/aiRecs.js';
import { query } from '../db.js';
import { getUserContextHash } from './aiContext.js';
import {
  getCachedRecsByHash,
  isRecsProcessing,
  userHasRecsForHash,
} from './aiRecsQueue.js';
import { hasDailyQuotaRemaining } from './aiRecsQuota.js';

export async function countWatchedShows(userId: string): Promise<number> {
  const { rows } = await query<{ c: string }>(
    'SELECT COUNT(DISTINCT show_id)::text AS c FROM watched WHERE user_id = $1',
    [userId]
  );
  return Number(rows[0]?.c ?? 0);
}

export async function getAiRecsStatus(userId: string): Promise<AiRecsStatus> {
  const watchedShows = await countWatchedShows(userId);
  const ready = watchedShows >= AI_RECS_MIN_WATCHED_SHOWS;

  if (!ready) {
    return {
      watchedShows,
      minRequired: AI_RECS_MIN_WATCHED_SHOWS,
      ready: false,
      howToWatch: AI_RECS_HOW_TO_WATCH_FA,
      generationStatus: 'none',
      quotaAvailable: false,
    };
  }

  const contextHash = await getUserContextHash(userId);
  const quotaAvailable = await hasDailyQuotaRemaining(userId);
  const hasRecs = await userHasRecsForHash(userId, contextHash);
  const sharedCache = !!(await getCachedRecsByHash(contextHash));
  const processing = await isRecsProcessing(userId, contextHash);

  let generationStatus: AiRecsStatus['generationStatus'] = 'pending';
  if (processing) {
    generationStatus = 'processing';
  } else if (hasRecs || sharedCache) {
    generationStatus = 'ready';
  } else if (!quotaAvailable) {
    generationStatus = 'quota_exhausted';
  } else {
    generationStatus = 'pending';
  }

  return {
    watchedShows,
    minRequired: AI_RECS_MIN_WATCHED_SHOWS,
    ready: true,
    howToWatch: AI_RECS_HOW_TO_WATCH_FA,
    generationStatus,
    quotaAvailable: quotaAvailable && !hasRecs && !sharedCache,
  };
}
