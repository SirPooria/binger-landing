import { config } from '../config.js';
import { cached } from '../redis.js';

const { apiKey, baseUrl } = config.tmdb;
const ttl = config.cacheTtl;

/** Low-level fetch against TMDB with the server-side key appended. */
async function tmdb<T = any>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

// ── Faithful ports of lib/tmdbClient.ts (server-side + cached) ──

export const getTrendingShows = (page = 1) =>
  cached(`tmdb:trending:${page}`, ttl.trending, async () => {
    const data = await tmdb('/trending/tv/week', { language: 'en-US', page });
    return data.results ?? [];
  });

export const getPopularShows = (page = 1) =>
  cached(`tmdb:popular:${page}`, ttl.list, async () => {
    const data = await tmdb('/discover/tv', {
      language: 'en-US',
      sort_by: 'vote_count.desc',
      page,
      'vote_count.gte': 1000,
    });
    return data.results ?? [];
  });

export const searchShows = (q: string) =>
  cached(`tmdb:search:${q.toLowerCase()}`, ttl.search, async () => {
    if (!q) return [];
    const data = await tmdb('/search/tv', { language: 'en-US', query: q });
    return data.results ?? [];
  });

export const getShowDetails = (id: string) =>
  cached(`tmdb:show:${id}`, ttl.showDetails, async () => {
    const dataFa = await tmdb(`/tv/${id}`, { language: 'fa-IR' });
    if (!dataFa.overview || dataFa.overview.trim() === '') {
      const dataEn = await tmdb(`/tv/${id}`, { language: 'en-US' });
      dataFa.overview = dataEn.overview;
      dataFa.tagline = dataEn.tagline;
      if (!dataFa.name) dataFa.name = dataEn.name;
    }
    return dataFa;
  });

export const getSeasonDetails = (id: string, seasonNumber: number) =>
  cached(`tmdb:season:${id}:${seasonNumber}`, ttl.season, async () => {
    const dataFa = await tmdb(`/tv/${id}/season/${seasonNumber}`, { language: 'fa-IR' });
    if (dataFa.episodes?.length && !dataFa.episodes[0].overview) {
      return await tmdb(`/tv/${id}/season/${seasonNumber}`, { language: 'en-US' });
    }
    return dataFa;
  });

export const getEpisodeDetails = (showId: string, seasonNum: string, episodeNum: string) =>
  cached(`tmdb:episode:${showId}:${seasonNum}:${episodeNum}`, ttl.episode, () =>
    tmdb(`/tv/${showId}/season/${seasonNum}/episode/${episodeNum}`, {
      language: 'en-US',
      append_to_response: 'credits,images',
    })
  );

export const getSimilarShows = (id: string) =>
  cached(`tmdb:similar:${id}`, ttl.list, async () => {
    const data = await tmdb(`/tv/${id}/similar`, { language: 'en-US' });
    return (data.results ?? []).slice(0, 5);
  });

export const getLatestAnime = () =>
  cached('tmdb:anime:latest', ttl.list, async () => {
    const data = await tmdb('/discover/tv', {
      language: 'en-US',
      sort_by: 'first_air_date.desc',
      with_genres: 16,
      with_origin_country: 'JP',
      'air_date.lte': new Date().toISOString().split('T')[0],
    });
    return data.results ?? [];
  });

export const getAsianDramas = () =>
  cached('tmdb:asian:dramas', ttl.list, async () => {
    const data = await tmdb('/discover/tv', {
      language: 'en-US',
      sort_by: 'first_air_date.desc',
      with_origin_country: 'KR|CN|TW',
      without_genres: 16,
      'air_date.lte': new Date().toISOString().split('T')[0],
    });
    return data.results ?? [];
  });

export const getNewestGlobal = () =>
  cached('tmdb:newest:global', ttl.trending, async () => {
    const data = await tmdb('/tv/on_the_air', { language: 'en-US', sort_by: 'popularity.desc', page: 1 });
    return data.results ?? [];
  });

export const getIranianShows = () =>
  cached('tmdb:iranian', ttl.list, async () => {
    const data = await tmdb('/discover/tv', { language: 'fa-IR', sort_by: 'popularity.desc', with_origin_country: 'IR' });
    return (data.results ?? []).filter((s: any) => s.poster_path);
  });

export const getNewestIranianShows = () =>
  cached('tmdb:iranian:newest', ttl.list, async () => {
    const data = await tmdb('/discover/tv', {
      language: 'fa-IR',
      sort_by: 'first_air_date.desc',
      with_origin_country: 'IR',
      'air_date.lte': new Date().toISOString().split('T')[0],
    });
    return (data.results ?? []).filter((s: any) => s.poster_path);
  });

export const getShowReviews = (id: string) =>
  cached(`tmdb:reviews:${id}`, ttl.list, async () => {
    const data = await tmdb(`/tv/${id}/reviews`, { language: 'en-US', page: 1 });
    return data.results ?? [];
  });

export const getShowsByGenre = (genreId: number | null, page = 1) =>
  cached(`tmdb:genre:${genreId ?? 'trending'}:${page}`, ttl.list, async () => {
    const data = genreId
      ? await tmdb('/discover/tv', { with_genres: genreId, sort_by: 'popularity.desc', page })
      : await tmdb('/trending/tv/week', { page });
    return data.results ?? [];
  });

export const getRecommendations = (showId: number) =>
  cached(`tmdb:recs:${showId}`, ttl.list, async () => {
    const data = await tmdb(`/tv/${showId}/recommendations`, { language: 'fa-IR', page: 1 });
    if (!data.results || data.results.length < 5) {
      const dataEn = await tmdb(`/tv/${showId}/recommendations`, { language: 'en-US', page: 1 });
      return dataEn.results ?? [];
    }
    return data.results ?? [];
  });

export const getGlobalAiringShows = () =>
  cached('tmdb:airing:global', ttl.trending, async () => {
    const [d1, d2] = await Promise.all([
      tmdb('/tv/on_the_air', { language: 'en-US' }),
      tmdb('/tv/airing_today', { language: 'en-US' }),
    ]);
    const map = new Map<number, any>();
    [...(d1.results ?? []), ...(d2.results ?? [])].forEach((s) => map.has(s.id) || map.set(s.id, s));
    const detailed = await Promise.all(Array.from(map.keys()).map((id) => getShowDetails(String(id))));
    return detailed.filter(
      (s: any) =>
        s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date() && s.poster_path
    );
  });
