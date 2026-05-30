import { create } from 'zustand';
import type { AuthUser } from '@binger/shared';
import { fetchCurrentUser, logout as authLogout, applyTokensFromCallback } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  init: () => Promise<void>;
  signInWithTokens: (access: string, refresh: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  setUser: (user) => set({ user }),

  init: async () => {
    const user = await fetchCurrentUser();
    // Do not clobber a user set by the OAuth/magic-link callback racing with init.
    set((state) => ({ user: state.user ?? user, initialized: true }));
  },

  signInWithTokens: async (access, refresh) => {
    const user = await applyTokensFromCallback(access, refresh);
    set({ user });
    return user;
  },

  signOut: async () => {
    await authLogout();
    set({ user: null });
  },
}));
