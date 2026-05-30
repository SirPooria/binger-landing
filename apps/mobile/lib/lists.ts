import { apiGet, apiPost } from './api';

export async function fetchWatchlistIds(_userId: string): Promise<number[]> {
  const rows = await apiGet<{ show_id: number }[]>('/watchlist');
  return rows.map((r) => r.show_id);
}

export interface UserList {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cover_show_id: number | null;
  likes_count: number;
  item_count?: number;
}

export async function fetchUserLists(_userId: string): Promise<UserList[]> {
  return apiGet<UserList[]>('/user-lists');
}

export async function createUserList(_userId: string, title: string, description?: string, isPublic = true) {
  return apiPost<UserList>('/user-lists', { title, description, is_public: isPublic });
}

export async function addShowToList(listId: string, showId: number, note?: string) {
  return apiPost('/user-lists/' + listId + '/items', { show_id: showId, note });
}

export async function fetchListItems(listId: string): Promise<number[]> {
  return apiGet<number[]>('/user-lists/' + listId + '/items');
}
