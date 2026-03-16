"use client";

import { create } from "zustand";

export type UiThemeMode = "system" | "light" | "dark";

interface UiStoreState {
  desktopSidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  themeMode: UiThemeMode;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebarCollapsed: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebarOpen: () => void;
  setThemeMode: (mode: UiThemeMode) => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  desktopSidebarCollapsed: false,
  mobileSidebarOpen: false,
  themeMode: "system",
  setDesktopSidebarCollapsed: (collapsed) =>
    set({ desktopSidebarCollapsed: collapsed }),
  toggleDesktopSidebarCollapsed: () =>
    set((state) => ({
      desktopSidebarCollapsed: !state.desktopSidebarCollapsed,
    })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebarOpen: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setThemeMode: (mode) => set({ themeMode: mode }),
}));
