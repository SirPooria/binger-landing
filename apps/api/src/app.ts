import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { config } from './config.js';
import { redis } from './redis.js';
import { tmdbRouter } from './routes/tmdb.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { aiRouter } from './routes/ai.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { authRouter } from './routes/auth.js';
import { dataRouter } from './routes/data.js';
import { mediaRouter } from './routes/media.js';

/** Builds the Express app without binding a port (so tests can import it). */
export function createApp() {
  const app = express();

  // Behind nginx in Docker; required for express-rate-limit + req.ip.
  app.set('trust proxy', 1);

  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  if (config.nodeEnv !== 'test') {
    app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // Redis-backed rate limiter: 300 req / minute / IP. Skipped under test to
  // keep integration tests hermetic and free of cross-test throttling.
  if (config.nodeEnv !== 'test') {
    const limiter = rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
      }),
    });
    app.use('/api/', limiter);
  }

  app.get('/api/v1/health', async (_req, res) => {
    let redisOk = false;
    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      redisOk = false;
    }
    res.json({ status: 'ok', redis: redisOk, ts: Date.now() });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/media', mediaRouter);
  app.use('/api/v1', dataRouter);
  app.use('/api/v1/tmdb', tmdbRouter);
  app.use('/api/v1/recommendations', recommendationsRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/leaderboard', leaderboardRouter);

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'validation_error',
        message: err.errors[0]?.message ?? 'داده نامعتبر',
      });
    }
    console.error('[api] unhandled', err);
    return res.status(500).json({ error: 'server_error', message: 'خطای سرور' });
  });

  return app;
}
