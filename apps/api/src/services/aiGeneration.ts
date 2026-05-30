import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { query } from '../db.js';
import { redis } from '../redis.js';
import { getShowDetails } from './tmdb.js';
import type { AiRecommendation } from './aiTypes.js';

const anthropic = config.ai.anthropicKey ? new Anthropic({ apiKey: config.ai.anthropicKey }) : null;

const SYSTEM_PROMPT = `You are Binger's AI recommendation engine for a Persian (Farsi) TV show tracking app.
You will be given a user's watch history with ratings and inferred favorite genres.
Suggest 10 TMDB TV show IDs that this user would love, that are NOT already in their history.
Return ONLY a valid JSON array, no prose, no markdown fences. Each item:
{"tmdb_id": <number>, "reason": "<short Persian explanation>", "based_on_show_id": <number or null>}
The "reason" MUST be written in natural, friendly Persian (Farsi), e.g. "چون عاشق Breaking Bad بودی، این یکی رو هم دوست داری".`;

export async function callLLMForContext(contextText: string): Promise<AiRecommendation[]> {
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

export async function persistRecommendationsForUser(
  userId: string,
  recs: AiRecommendation[]
): Promise<void> {
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

export async function hydrateRecommendations(
  recs: AiRecommendation[]
): Promise<(AiRecommendation & { show: unknown })[]> {
  return Promise.all(
    recs.map(async (r) => ({ ...r, show: await getShowDetails(String(r.tmdb_id)).catch(() => null) }))
  );
}

export async function setUserRecsRedis(
  userId: string,
  hydrated: (AiRecommendation & { show: unknown })[]
): Promise<void> {
  const cacheKey = `ai:recs:${userId}`;
  await redis.set(cacheKey, JSON.stringify(hydrated), 'EX', config.cacheTtl.aiRecs).catch(() => {});
}
