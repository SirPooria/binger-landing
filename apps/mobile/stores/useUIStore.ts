import { create } from 'zustand';
import { I18nManager } from 'react-native';

interface UIState {
  isRTL: boolean;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isRTL: I18nManager.isRTL,
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
