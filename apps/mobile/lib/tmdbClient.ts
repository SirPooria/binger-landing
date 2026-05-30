// Mirror of the original web lib/tmdbClient.ts, but every call now routes
// through the API gateway (TMDB key stays server-side). Image helpers are
// unchanged — they point straight at TMDB's public CDN.
import { apiGet } from './api';
import type { TmdbShow, TmdbSeason, TmdbEpisode } from '@binger/shared';

export const getImageUrl = (path: string | null) =>
  path ? `https://image.tmdb.org/t/p/w500${path}` : null;

export const getBackdropUrl = (path: string | null) =>
  path ? `https://image.tmdb.org/t/p/original${path}` : '';

export const getTrendingShows = (page = 1) =>
  apiGet<TmdbShow[]>(`/tmdb/trending?page=${page}`);

export const getPopularShows = (page = 1) =>
  apiGet<TmdbShow[]>(`/tmdb/popular?page=${page}`);

export const searchShows = (query: string) =>
  query ? apiGet<TmdbShow[]>(`/tmdb/search?q=${encodeURIComponent(query)}`) : Promise.resolve([]);

export const getShowDetails = (id: string | number) =>
  apiGet<TmdbShow>(`/tmdb/shows/${id}`);

export const getSeasonDetails = (id: string | number, seasonNumber: number) =>
  apiGet<TmdbSeason>(`/tmdb/shows/${id}/season/${seasonNumber}`);

export const getEpisodeDetails = (showId: string | number, seasonNum: string | number, episodeNum: string | number) =>
  apiGet<TmdbEpisode & { credits?: any; images?: any }>(`/tmdb/shows/${showId}/season/${seasonNum}/episode/${episodeNum}`);

export const getSimilarShows = (id: string | number) =>
  apiGet<TmdbShow[]>(`/tmdb/shows/${id}/similar`);

export const getRecommendations = (showId: number) =>
  apiGet<TmdbShow[]>(`/tmdb/shows/${showId}/recommendations`);

export const getShowReviews = (id: string | number) =>
  apiGet<any[]>(`/tmdb/shows/${id}/reviews`);

export const getLatestAnime = () => apiGet<TmdbShow[]>('/tmdb/anime');
export const getAsianDramas = () => apiGet<TmdbShow[]>('/tmdb/asian');
export const getNewestGlobal = () => apiGet<TmdbShow[]>('/tmdb/newest');
export const getIranianShows = () => apiGet<TmdbShow[]>('/tmdb/iranian');
export const getNewestIranianShows = () => apiGet<TmdbShow[]>('/tmdb/iranian/newest');
export const getGlobalAiringShows = () => apiGet<TmdbShow[]>('/tmdb/airing');

export const getShowsByGenre = (genreId: number | null, page = 1) =>
  apiGet<TmdbShow[]>(`/tmdb/genre/${genreId ?? 'null'}?page=${page}`);
