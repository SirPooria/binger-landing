import { apiGet, apiPost } from './api';
import type { AiRecommendation, AiRecsStatus, MoodChatResponse } from '@binger/shared';

export const getAiRecommendations = () => apiGet<AiRecommendation[]>('/recommendations/me');

export const getAiRecsStatus = () => apiGet<AiRecsStatus>('/recommendations/me/status');

export const generateAiRecommendations = () =>
  apiPost<AiRecommendation[]>('/recommendations/me/generate');

export const postMoodChat = (message: string) =>
  apiPost<MoodChatResponse>('/ai/mood', { message });
