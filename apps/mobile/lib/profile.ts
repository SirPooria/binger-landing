import { apiGet, apiPost, apiDelete, apiPatch } from './api';
import type { Profile, AuthUser } from '@binger/shared';
import { uploadImageAsync } from './upload';

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

export async function updateProfile(input: {
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
}): Promise<Profile> {
  return apiPatch<Profile>('/profiles/me', input);
}

export async function uploadAvatar(localUri: string): Promise<string> {
  return uploadImageAsync(localUri);
}

export async function refreshAuthUser(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export async function isFollowing(_followerId: string, followingId: string): Promise<boolean> {
  const { following } = await apiGet<{ following: boolean }>(`/follows/check/${followingId}`);
  return following;
}

export async function toggleFollow(_followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (currentlyFollowing) return apiDelete(`/follows/${followingId}`);
  return apiPost(`/follows/${followingId}`);
}
