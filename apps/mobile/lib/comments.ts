import { apiGet, apiPost } from './api';
import type { CommentReaction } from '@binger/shared';

export interface CommentRow {
  id: number;
  user_id: string;
  show_id: number | null;
  episode_id: number | null;
  content: string | null;
  parent_id: number | null;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null };
  comment_media?: { id: string; media_type: string; url: string; thumbnail_url: string | null }[];
  comment_reactions?: { reaction: string; user_id: string }[];
  replies?: CommentRow[];
}

export async function fetchComments(opts: { showId?: number; episodeId?: number }): Promise<CommentRow[]> {
  const q = opts.episodeId ? `episode_id=${opts.episodeId}` : `show_id=${opts.showId}`;
  const rows = await apiGet<CommentRow[]>(`/comments?${q}`);
  const top = rows.filter((c) => !c.parent_id);
  const byParent = new Map<number, CommentRow[]>();
  rows.filter((c) => c.parent_id).forEach((c) => {
    if (!byParent.has(c.parent_id!)) byParent.set(c.parent_id!, []);
    byParent.get(c.parent_id!)!.push(c);
  });
  top.forEach((c) => (c.replies = (byParent.get(c.id) ?? []).reverse()));
  return top;
}

export async function postComment(input: {
  userId: string;
  showId?: number;
  episodeId?: number;
  content: string;
  parentId?: number;
}) {
  return apiPost<CommentRow>('/comments', {
    show_id: input.showId,
    episode_id: input.episodeId,
    content: input.content,
    parent_id: input.parentId,
  });
}

export async function attachMedia(
  commentId: number,
  mediaType: string,
  url: string,
  thumbnailUrl?: string,
  showId?: number,
  episodeId?: number
) {
  return apiPost(`/comments/${commentId}/media`, {
    media_type: mediaType,
    url,
    thumbnail_url: thumbnailUrl,
    show_id: showId,
    episode_id: episodeId,
  });
}

export async function toggleReaction(
  _userId: string,
  commentId: number,
  reaction: CommentReaction,
  active: boolean
) {
  return apiPost(`/comments/${commentId}/reactions`, { reaction, active });
}

export async function fetchEpisodeScreenshots(showId: number) {
  return apiGet<any[]>(`/episode-screenshots?show_id=${showId}`);
}
