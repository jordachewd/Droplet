"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PersonaId } from "@/types/PersonaData.d";

interface PreferencesStoreState {
  preferredPersonaId: PersonaId | null;
  setPreferredPersonaId: (personaId: PersonaId) => void;
}

export const usePreferencesStore = create<PreferencesStoreState>()(
  persist(
    (set) => ({
      preferredPersonaId: null,
      setPreferredPersonaId: (personaId) =>
        set({ preferredPersonaId: personaId }),
    }),
    {
      name: "droplet-user-preferences",
      partialize: (state) => ({
        preferredPersonaId: state.preferredPersonaId,
      }),
    },
  ),
);
