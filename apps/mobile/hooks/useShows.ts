import { useQuery } from '@tanstack/react-query';
import * as tmdb from '@/lib/tmdbClient';
import { getAiRecommendations } from '@/lib/ai';

export const useTrending = () =>
  useQuery({ queryKey: ['trending'], queryFn: () => tmdb.getTrendingShows(1) });

export const useIranian = () =>
  useQuery({ queryKey: ['iranian'], queryFn: tmdb.getIranianShows });

export const useAnime = () =>
  useQuery({ queryKey: ['anime'], queryFn: tmdb.getLatestAnime });

export const useAsianDramas = () =>
  useQuery({ queryKey: ['asian'], queryFn: tmdb.getAsianDramas });

export const useNewestGlobal = () =>
  useQuery({ queryKey: ['newest'], queryFn: tmdb.getNewestGlobal });

export const useShowDetails = (id: string | number) =>
  useQuery({ queryKey: ['show', String(id)], queryFn: () => tmdb.getShowDetails(id), enabled: !!id });

export const useSeasonDetails = (id: string | number, season: number) =>
  useQuery({
    queryKey: ['season', String(id), season],
    queryFn: () => tmdb.getSeasonDetails(id, season),
    enabled: !!id && season >= 0,
  });

export const useShowsByGenre = (genreId: number | null) =>
  useQuery({ queryKey: ['genre', genreId], queryFn: () => tmdb.getShowsByGenre(genreId, 1) });

export const useAiRecommendations = (userId: string | undefined) =>
  useQuery({
    queryKey: ['ai-recs', userId],
    queryFn: () => getAiRecommendations(userId!),
    enabled: !!userId,
    staleTime: 24 * 60 * 60 * 1000,
  });
