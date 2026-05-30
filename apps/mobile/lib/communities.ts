import { apiGet, apiPost } from './api';

export async function fetchGroups() {
  return apiGet<any[]>('/groups');
}

export async function createGroup(_userId: string, name: string, description?: string, showId?: number) {
  // MVP: join existing groups only; create can be added to API later
  return { id: '', name, description, show_id: showId };
}

export async function joinGroup(groupId: string, _userId: string) {
  return apiPost(`/groups/${groupId}/join`);
}

export async function fetchMyGroupIds(_userId: string): Promise<string[]> {
  return apiGet<string[]>('/groups/my-ids');
}

export async function fetchGroupPosts(_groupId: string) {
  return [];
}

export async function postToGroup(_groupId: string, _userId: string, _content: string) {
  return { ok: true };
}

export async function fetchChannels() {
  return apiGet<any[]>('/channels');
}

export async function subscribeChannel(channelId: string, _userId: string) {
  return apiPost(`/channels/${channelId}/subscribe`);
}

export async function fetchMyChannelIds(_userId: string): Promise<string[]> {
  return apiGet<string[]>('/channels/my-ids');
}
