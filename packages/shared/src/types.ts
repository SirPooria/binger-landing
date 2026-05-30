export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface TmdbShow {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  next_episode_to_air?: { air_date: string; season_number: number; episode_number: number } | null;
  number_of_seasons?: number;
  seasons?: TmdbSeason[];
  tagline?: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count?: number;
  poster_path: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
  still_path: string | null;
  air_date?: string;
  vote_average?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  onboarding_complete: boolean;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  level: number;
  onboarding_complete?: boolean;
  email?: string;
}

export interface AiRecommendation {
  tmdb_id: number;
  reason: string;
  score?: number;
  based_on_show_id?: number;
  show?: TmdbShow | null;
}

export type FeedActivityType =
  | 'watchedEpisode'
  | 'rating'
  | 'addedToList'
  | 'comment'
  | 'badge';

export interface FeedItem {
  id: string;
  type: FeedActivityType;
  user: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  show_id?: number;
  show?: TmdbShow | null;
  text: string;
  created_at: string;
}

export type NotificationType =
  | 'new_follower'
  | 'comment_reply'
  | 'like'
  | 'badge_earned'
  | 'new_episode'
  | 'story_view'
  | 'group_invite';

export const COMMENT_REACTIONS = ['❤️', '😂', '😭', '🔥', '👏', '😤'] as const;
export type CommentReaction = (typeof COMMENT_REACTIONS)[number];
