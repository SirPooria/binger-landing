import { apiGet, apiPost } from './api';
import type { AiRecommendation } from '@binger/shared';

/** AI-powered, dynamic recommendations for a user (gateway caches 24h). */
export const getAiRecommendations = (userId: string) =>
  apiGet<AiRecommendation[]>(`/recommendations/${userId}`);

/** Force the gateway to regenerate (e.g. after 5 new watches). */
export const refreshAiRecommendations = (userId: string) =>
  apiPost<AiRecommendation[]>(`/recommendations/${userId}/refresh`);
