import { Router } from 'express';
import { query } from '../db.js';
import { cached } from '../redis.js';

export const leaderboardRouter = Router();

// GET /api/v1/leaderboard — global leaderboard via Postgres function
leaderboardRouter.get('/', async (_req, res) => {
  try {
    const data = await cached('leaderboard:global', 300, async () => {
      const { rows } = await query('SELECT * FROM get_global_leaderboard()');
      return rows;
    });
    res.json({ data });
  } catch (err) {
    console.error('[leaderboard]', (err as Error).message);
    res.status(500).json({ error: 'leaderboard_error' });
  }
});
