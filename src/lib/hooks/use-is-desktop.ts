"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeToDesktopQuery(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQueryList.addEventListener("change", onStoreChange);

  return () => {
    mediaQueryList.removeEventListener("change", onStoreChange);
  };
}

function getDesktopSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getDesktopServerSnapshot(): boolean {
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktopQuery,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
}
