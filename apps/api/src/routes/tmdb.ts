import { Router } from 'express';
import * as tmdb from '../services/tmdb.js';

export const tmdbRouter = Router();

const ok = (res: any, data: unknown) => res.json({ data });
const fail = (res: any, err: unknown) => {
  console.error('[tmdb route]', (err as Error).message);
  res.status(502).json({ error: 'tmdb_upstream_error' });
};

tmdbRouter.get('/trending', async (req, res) => {
  try {
    ok(res, await tmdb.getTrendingShows(Number(req.query.page ?? 1)));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/popular', async (req, res) => {
  try {
    ok(res, await tmdb.getPopularShows(Number(req.query.page ?? 1)));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/search', async (req, res) => {
  try {
    ok(res, await tmdb.searchShows(String(req.query.q ?? '')));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/iranian', async (_req, res) => {
  try {
    ok(res, await tmdb.getIranianShows());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/iranian/newest', async (_req, res) => {
  try {
    ok(res, await tmdb.getNewestIranianShows());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/anime', async (_req, res) => {
  try {
    ok(res, await tmdb.getLatestAnime());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/asian', async (_req, res) => {
  try {
    ok(res, await tmdb.getAsianDramas());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/newest', async (_req, res) => {
  try {
    ok(res, await tmdb.getNewestGlobal());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/airing', async (_req, res) => {
  try {
    ok(res, await tmdb.getGlobalAiringShows());
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/genre/:genreId', async (req, res) => {
  try {
    const g = req.params.genreId === 'null' ? null : Number(req.params.genreId);
    ok(res, await tmdb.getShowsByGenre(g, Number(req.query.page ?? 1)));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id', async (req, res) => {
  try {
    ok(res, await tmdb.getShowDetails(req.params.id));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id/similar', async (req, res) => {
  try {
    ok(res, await tmdb.getSimilarShows(req.params.id));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id/recommendations', async (req, res) => {
  try {
    ok(res, await tmdb.getRecommendations(Number(req.params.id)));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id/reviews', async (req, res) => {
  try {
    ok(res, await tmdb.getShowReviews(req.params.id));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id/season/:season', async (req, res) => {
  try {
    ok(res, await tmdb.getSeasonDetails(req.params.id, Number(req.params.season)));
  } catch (e) {
    fail(res, e);
  }
});

tmdbRouter.get('/shows/:id/season/:season/episode/:episode', async (req, res) => {
  try {
    ok(res, await tmdb.getEpisodeDetails(req.params.id, req.params.season, req.params.episode));
  } catch (e) {
    fail(res, e);
  }
});
