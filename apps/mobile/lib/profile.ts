import { apiGet, apiPost, apiDelete } from './api';
import type { Profile } from '@binger/shared';

export interface ProfileStats {
  profile: Profile | null;
  watchedCount: number;
  followingCount: number;
  followersCount: number;
  badges: string[];
  favoriteShowIds: number[];
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  return apiGet<ProfileStats>(`/profiles/${userId}/stats`);
}

export async function isFollowing(_followerId: string, followingId: string): Promise<boolean> {
  const { following } = await apiGet<{ following: boolean }>(`/follows/check/${followingId}`);
  return following;
}

export async function toggleFollow(_followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (currentlyFollowing) return apiDelete(`/follows/${followingId}`);
  return apiPost(`/follows/${followingId}`);
}
