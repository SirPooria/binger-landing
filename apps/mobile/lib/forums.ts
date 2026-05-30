import { apiGet, apiPost } from './api';

export const FORUM_CATEGORIES = [
  { key: 'general', label: 'عمومی' },
  { key: 'theories', label: 'تئوری‌ها' },
  { key: 'cast', label: 'کست' },
  { key: 'episode', label: 'اپیزودها' },
] as const;

export type ForumSort = 'newest' | 'popular' | 'hot';

export interface ForumThread {
  id: string;
  show_id: number;
  category: string;
  title: string;
  body: string;
  user_id: string;
  is_pinned: boolean;
  is_spoiler: boolean;
  views_count: number;
  replies_count: number;
  likes_count: number;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null };
}

export async function fetchThreads(showId: number, category: string | null, sort: ForumSort): Promise<ForumThread[]> {
  const q = new URLSearchParams({ show_id: String(showId), sort });
  if (category) q.set('category', category);
  return apiGet<ForumThread[]>(`/forums?${q}`);
}

export async function createThread(input: {
  userId: string;
  showId: number;
  category: string;
  title: string;
  body: string;
  isSpoiler?: boolean;
}) {
  return apiPost<ForumThread>('/forums', {
    show_id: input.showId,
    category: input.category,
    title: input.title,
    body: input.body,
    is_spoiler: input.isSpoiler,
  });
}

export async function fetchForum(forumId: string): Promise<ForumThread | null> {
  return apiGet<ForumThread | null>(`/forums/${forumId}`);
}

export async function fetchReplies(forumId: string) {
  return apiGet<any[]>(`/forums/${forumId}/replies`);
}

export async function postReply(forumId: string, body: string) {
  return apiPost<{ ok: boolean }>(`/forums/${forumId}/replies`, { body });
}
