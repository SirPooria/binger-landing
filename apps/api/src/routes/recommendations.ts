import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { requireAuth } from '../middleware/auth.js';
import { redis } from '../redis.js';
import { config } from '../config.js';
import { getRecommendationsForUser } from '../services/ai.js';
import { generateAiRecsForUser } from '../services/aiRecsGenerate.js';
import { getAiRecsStatus } from '../services/aiRecsStatus.js';

export const recommendationsRouter = Router();

recommendationsRouter.use(requireAuth);

const recsLimiter =
  config.nodeEnv === 'test'
    ? (_req: unknown, _res: unknown, next: () => void) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 60,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `recs:${req.user?.id ?? req.ip}`,
        message: { error: 'rate_limited', message: 'محدودیت درخواست پیشنهاد هوش مصنوعی.' },
        store: new RedisStore({
          prefix: 'rl:recs:',
          sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
        }),
      });

const generateLimiter =
  config.nodeEnv === 'test'
    ? (_req: unknown, _res: unknown, next: () => void) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 10,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `recs-gen:${req.user?.id ?? req.ip}`,
        message: { error: 'rate_limited', message: 'محدودیت درخواست — کمی بعد دوباره امتحان کن.' },
        store: new RedisStore({
          prefix: 'rl:recs-gen:',
          sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
        }),
      });

function assertSelf(req: { user?: { id: string }; params: { userId?: string } }, res: any): string | null {
  const id = req.params.userId;
  if (!req.user || id !== req.user.id) {
    res.status(403).json({ error: 'forbidden', message: 'فقط به پیشنهادهای خودت دسترسی داری.' });
    return null;
  }
  return id;
}

recommendationsRouter.get('/me/status', async (req, res) => {
  try {
    res.json({ data: await getAiRecsStatus(req.user!.id) });
  } catch (err) {
    console.error('[recommendations/status]', err);
    res.status(500).json({ error: 'status_error' });
  }
});

recommendationsRouter.get('/me', recsLimiter, async (req, res) => {
  try {
    const recs = await getRecommendationsForUser(req.user!.id);
    res.json({ data: recs });
  } catch (err) {
    console.error('[recommendations/me]', (err as Error).message);
    res.status(500).json({ error: 'recommendation_error', message: (err as Error).message });
  }
});

/** On-demand generation — uses at most one LLM call per calendar day (server TZ). */
recommendationsRouter.post('/me/generate', generateLimiter, async (req, res) => {
  try {
    const result = await generateAiRecsForUser(req.user!.id);
    if (!result.ok) {
      const status =
        result.error === 'quota_exhausted'
          ? 429
          : result.error === 'not_eligible'
            ? 403
            : result.error === 'processing'
              ? 409
              : 502;
      return res.status(status).json({ error: result.error, data: result.data });
    }
    res.json({ data: result.data });
  } catch (err) {
    console.error('[recommendations/me/generate]', (err as Error).message);
    res.status(500).json({ error: 'recommendation_error', message: (err as Error).message });
  }
});

recommendationsRouter.get('/:userId', recsLimiter, async (req, res) => {
  const userId = assertSelf(req, res);
  if (!userId) return;
  try {
    const recs = await getRecommendationsForUser(userId);
    res.json({ data: recs });
  } catch (err) {
    console.error('[recommendations]', (err as Error).message);
    res.status(500).json({ error: 'recommendation_error', message: (err as Error).message });
  }
});
