import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { redis } from '../redis.js';
import { config } from '../config.js';
import { handleMoodChatMessage } from '../services/moodChat.js';
import { query } from '../db.js';

export const aiRouter = Router();

aiRouter.use(requireAuth);

const moodLimiter =
  config.nodeEnv === 'test'
    ? (_req: unknown, _res: unknown, next: () => void) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 40,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
        message: { error: 'rate_limited', message: 'محدودیت ساعتی چت — کمی بعد دوباره امتحان کن.' },
        store: new RedisStore({
          prefix: 'rl:mood:',
          sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
        }),
      });

const bodySchema = z.object({
  message: z.string().trim().min(2).max(400),
});

// POST /api/v1/ai/mood — rule-based mood chat (not Claude)
aiRouter.post('/mood', moodLimiter, async (req, res) => {
  try {
    const { message } = bodySchema.parse(req.body);
    const result = await handleMoodChatMessage(message);

    if (result.match === 'fallback') {
      await query(
        `INSERT INTO ai_mood_logs (user_id, query_text, match_kind) VALUES ($1, $2, 'fallback')`,
        [req.user!.id, message]
      ).catch(() => {});
    }

    res.json({ data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', message: 'پیام باید بین ۲ تا ۴۰۰ کاراکتر باشد.' });
    }
    console.error('[ai/mood]', err);
    res.status(500).json({ error: 'mood_chat_error', message: 'پردازش درخواست ناموفق بود.' });
  }
});
