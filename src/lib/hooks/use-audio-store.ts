"use client";

import { create } from "zustand";

interface AudioStoreState {
  activeAudioId: string | null;
  audioElements: Record<string, HTMLAudioElement>;
  registerAudio: (audioId: string, audioElement: HTMLAudioElement) => void;
  unregisterAudio: (audioId: string) => void;
  activateAudio: (audioId: string) => void;
  clearActiveAudio: (audioId: string) => void;
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  activeAudioId: null,
  audioElements: {},
  registerAudio: (audioId, audioElement) =>
    set((state) => ({
      audioElements: {
        ...state.audioElements,
        [audioId]: audioElement,
      },
    })),
  unregisterAudio: (audioId) =>
    set((state) => {
      const nextAudioElements = { ...state.audioElements };
      delete nextAudioElements[audioId];

      return {
        activeAudioId:
          state.activeAudioId === audioId ? null : state.activeAudioId,
        audioElements: nextAudioElements,
      };
    }),
  activateAudio: (audioId) => {
    const { activeAudioId, audioElements } = get();

    if (activeAudioId && activeAudioId !== audioId) {
      audioElements[activeAudioId]?.pause();
    }

    set({
      activeAudioId: audioId,
    });
  },
  clearActiveAudio: (audioId) =>
    set((state) =>
      state.activeAudioId === audioId
        ? {
            activeAudioId: null,
          }
        : {},
    ),
}));
