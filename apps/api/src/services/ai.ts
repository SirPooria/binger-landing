import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { query } from '../db.js';
import { redis } from '../redis.js';
import { getShowDetails } from './tmdb.js';

export interface AiRecommendation {
  tmdb_id: number;
  reason: string; // Persian explanation
  score?: number;
  based_on_show_id?: number;
}

const anthropic = config.ai.anthropicKey ? new Anthropic({ apiKey: config.ai.anthropicKey }) : null;

interface WatchContextRow {
  show_id: number;
  rating: number | null;
}

/** Builds a Persian-context prompt from the user's watch + rating history. */
async function buildUserContext(userId: string): Promise<{ shows: { id: number; name: string; genres: string[]; rating: number | null }[] }> {
  const { rows } = await query<WatchContextRow>(
    `SELECT w.show_id,
            r.rating
       FROM (SELECT DISTINCT show_id FROM watched WHERE user_id = $1 ORDER BY show_id DESC LIMIT 50) w
       LEFT JOIN show_ratings r ON r.show_id = w.show_id AND r.user_id = $1`,
    [userId]
  );

  const shows = await Promise.all(
    rows.map(async (row) => {
      const details = await getShowDetails(String(row.show_id)).catch(() => null);
      return {
        id: row.show_id,
        name: details?.name ?? `Show ${row.show_id}`,
        genres: (details?.genres ?? []).map((g: any) => g.name),
        rating: row.rating,
      };
    })
  );
  return { shows };
}

const SYSTEM_PROMPT = `You are Binger's AI recommendation engine for a Persian (Farsi) TV show tracking app.
You will be given a user's watch history with ratings and inferred favorite genres.
Suggest 10 TMDB TV show IDs that this user would love, that are NOT already in their history.
Return ONLY a valid JSON array, no prose, no markdown fences. Each item:
{"tmdb_id": <number>, "reason": "<short Persian explanation>", "based_on_show_id": <number or null>}
The "reason" MUST be written in natural, friendly Persian (Farsi), e.g. "چون عاشق Breaking Bad بودی، این یکی رو هم دوست داری".`;

/** Calls the LLM and returns parsed recommendations. Falls back to [] on failure. */
async function callLLM(contextText: string): Promise<AiRecommendation[]> {
  if (!anthropic) {
    throw new Error('No AI provider configured (set ANTHROPIC_API_KEY)');
  }
  const msg = await anthropic.messages.create({
    model: config.ai.model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contextText }],
  });
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
  const jsonStart = text.indexOf('[');
  const jsonEnd = text.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('LLM did not return JSON array');
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AiRecommendation[];
  return parsed.filter((r) => typeof r.tmdb_id === 'number');
}

async function persistRecommendations(userId: string, recs: AiRecommendation[]): Promise<void> {
  if (recs.length === 0) return;
  await query('DELETE FROM ai_recommendations WHERE user_id = $1', [userId]);
  for (const [i, rec] of recs.entries()) {
    await query(
      `INSERT INTO ai_recommendations (user_id, show_id, score, reason, based_on_show_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, show_id) DO UPDATE
         SET score = EXCLUDED.score, reason = EXCLUDED.reason, generated_at = now()`,
      [userId, rec.tmdb_id, rec.score ?? 1 - i * 0.05, rec.reason ?? null, rec.based_on_show_id ?? null]
    );
  }
}

/**
 * Returns AI recommendations for a user, hydrated with TMDB show data.
 * Cache layers: Redis (24h) → ai_recommendations table → fresh LLM call.
 */
export async function getRecommendationsForUser(
  userId: string,
  opts: { force?: boolean } = {}
): Promise<(AiRecommendation & { show: any })[]> {
  const cacheKey = `ai:recs:${userId}`;

  if (!opts.force) {
    const cachedRaw = await redis.get(cacheKey).catch(() => null);
    if (cachedRaw) return JSON.parse(cachedRaw);

    // Fall back to DB-stored recs if still fresh (< 24h).
    const { rows } = await query<{ show_id: number; reason: string; score: number; based_on_show_id: number | null }>(
      `SELECT show_id, reason, score, based_on_show_id
         FROM ai_recommendations
        WHERE user_id = $1 AND generated_at > now() - interval '24 hours'
        ORDER BY score DESC`,
      [userId]
    );
    if (rows.length > 0) {
      const hydrated = await hydrate(rows.map((r) => ({ tmdb_id: r.show_id, reason: r.reason, score: r.score, based_on_show_id: r.based_on_show_id ?? undefined })));
      await redis.set(cacheKey, JSON.stringify(hydrated), 'EX', config.cacheTtl.aiRecs).catch(() => {});
      return hydrated;
    }
  }

  const { shows } = await buildUserContext(userId);
  const contextText =
    shows.length === 0
      ? 'The user has no watch history yet. Recommend 10 widely-loved, highly-rated TV shows across diverse genres.'
      : `User watch history (name — genres — rating/5):\n` +
        shows.map((s) => `- ${s.name} — ${s.genres.join(', ') || 'unknown'} — ${s.rating ?? 'unrated'}`).join('\n');

  let recs: AiRecommendation[] = [];
  try {
    recs = await callLLM(contextText);
  } catch (err) {
    console.error('[ai] LLM call failed:', (err as Error).message);
    recs = [];
  }

  await persistRecommendations(userId, recs).catch((e) => console.warn('[ai] persist failed:', e.message));
  const hydrated = await hydrate(recs);
  await redis.set(cacheKey, JSON.stringify(hydrated), 'EX', config.cacheTtl.aiRecs).catch(() => {});
  return hydrated;
}

async function hydrate(recs: AiRecommendation[]): Promise<(AiRecommendation & { show: any })[]> {
  return Promise.all(
    recs.map(async (r) => ({ ...r, show: await getShowDetails(String(r.tmdb_id)).catch(() => null) }))
  );
}
