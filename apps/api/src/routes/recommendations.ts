import { Router } from 'express';
import { getRecommendationsForUser } from '../services/ai.js';

export const recommendationsRouter = Router();

// GET /api/v1/recommendations/:userId  — AI-powered, dynamic (cached 24h)
recommendationsRouter.get('/:userId', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const recs = await getRecommendationsForUser(req.params.userId, { force });
    res.json({ data: recs });
  } catch (err) {
    console.error('[recommendations]', (err as Error).message);
    res.status(500).json({ error: 'recommendation_error', message: (err as Error).message });
  }
});

// POST /api/v1/recommendations/:userId/refresh — force regeneration
recommendationsRouter.post('/:userId/refresh', async (req, res) => {
  try {
    const recs = await getRecommendationsForUser(req.params.userId, { force: true });
    res.json({ data: recs });
  } catch (err) {
    res.status(500).json({ error: 'recommendation_error', message: (err as Error).message });
  }
});
