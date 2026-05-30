import { apiGet, apiPost } from './api';
import type { FeedItem } from '@binger/shared';

export interface StoryGroup {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  stories: any[];
  hasUnseen: boolean;
}

export async function fetchActiveStories(): Promise<StoryGroup[]> {
  const data = await apiGet<any[]>('/stories');
  const groups = new Map<string, StoryGroup>();
  for (const s of data) {
    const p = s.profiles;
    if (!p) continue;
    if (!groups.has(p.id)) {
      groups.set(p.id, { user_id: p.id, username: p.username, avatar_url: p.avatar_url, stories: [], hasUnseen: true });
    }
    groups.get(p.id)!.stories.push(s);
  }
  return Array.from(groups.values());
}

export async function createStory(input: {
  user_id: string;
  show_id?: number;
  episode_id?: number;
  content_type: string;
  image_url?: string;
  text_overlay?: string;
}) {
  return apiPost('/stories', input);
}

export async function fetchSocialFeed(_userId: string): Promise<FeedItem[]> {
  return apiGet<FeedItem[]>('/feed');
}

export async function fetchNotifications(_userId: string) {
  return apiGet<any[]>('/notifications');
}

export async function markNotificationsRead(_userId: string) {
  return apiPost('/notifications/read-all');
}

export async function recordStoryView(storyId: string) {
  return apiPost(`/stories/${storyId}/view`);
}
