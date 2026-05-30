import { create } from 'zustand';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface WatchlistState {
  showIds: Set<number>;
  loaded: boolean;
  load: (userId: string) => Promise<void>;
  isInList: (showId: number) => boolean;
  toggle: (userId: string, showId: number) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  showIds: new Set(),
  loaded: false,

  load: async (_userId) => {
    const rows = await apiGet<{ show_id: number }[]>('/watchlist');
    set({ showIds: new Set(rows.map((r) => r.show_id)), loaded: true });
  },

  isInList: (showId) => get().showIds.has(showId),

  toggle: async (_userId, showId) => {
    const next = new Set(get().showIds);
    const wasIn = next.has(showId);
    wasIn ? next.delete(showId) : next.add(showId);
    set({ showIds: next });
    try {
      if (wasIn) await apiDelete(`/watchlist/${showId}`);
      else await apiPost('/watchlist', { show_id: showId });
    } catch {
      const rollback = new Set(get().showIds);
      wasIn ? rollback.add(showId) : rollback.delete(showId);
      set({ showIds: rollback });
    }
  },
}));
