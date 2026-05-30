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

/** Postgres BIGINT ids may arrive as strings in JSON — normalize before threading. */
function normalizeCommentRow(c: CommentRow): CommentRow {
  return {
    ...c,
    id: Number(c.id),
    show_id: c.show_id != null ? Number(c.show_id) : null,
    episode_id: c.episode_id != null ? Number(c.episode_id) : null,
    parent_id: c.parent_id != null ? Number(c.parent_id) : null,
  };
}

export async function fetchComments(opts: { showId?: number; episodeId?: number }): Promise<CommentRow[]> {
  const q = opts.episodeId ? `episode_id=${opts.episodeId}` : `show_id=${opts.showId}`;
  const rows = (await apiGet<CommentRow[]>(`/comments?${q}`)).map(normalizeCommentRow);
  const top = rows.filter((c) => !c.parent_id);
  const byParent = new Map<number, CommentRow[]>();
  rows.filter((c) => c.parent_id).forEach((c) => {
    const pid = c.parent_id!;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  });
  top.forEach((c) => (c.replies = (byParent.get(c.id) ?? []).reverse()));
  return top;
}

export async function postComment(input: {
  showId?: number;
  episodeId?: number;
  content?: string;
  parentId?: number;
}) {
  return apiPost<CommentRow>('/comments', {
    show_id: input.showId != null ? Number(input.showId) : undefined,
    episode_id: input.episodeId != null ? Number(input.episodeId) : undefined,
    content: input.content,
    parent_id: input.parentId != null ? Number(input.parentId) : undefined,
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
