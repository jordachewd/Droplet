"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { ThemeMode } from "@/types/ThemeData.d";

interface ThemeProps {
  children: ReactNode;
}

type ResolvedThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (nextMode: ThemeMode) => void;
}

const STORAGE_KEY = "droplet-theme-mode";
const LEGACY_STORAGE_KEY = "cellesseon-theme-mode";
const THEME_ATTRIBUTE = "data-droplet-theme";

export const DropletThemeContext = createContext<ThemeContextValue | null>(
  null,
);

const getSystemMode = (): ResolvedThemeMode =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getStoredMode = (): ThemeMode => {
  try {
    const storedThemeMode =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (
      storedThemeMode === "light" ||
      storedThemeMode === "dark" ||
      storedThemeMode === "system"
    ) {
      return storedThemeMode;
    }
  } catch {
    // Ignore storage access errors and fallback to system mode.
  }

  return "system";
};

const persistMode = (nextMode: ThemeMode) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  } catch {
    // Ignore storage access errors; theme still applies for this session.
  }
};

export default function DropletTheme({ children }: ThemeProps) {
  const mode = useUiStore((state) => state.themeMode);
  const setModeState = useUiStore((state) => state.setThemeMode);
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>("light");

  const applyTheme = useCallback((targetMode: ThemeMode) => {
    const nextResolvedMode =
      targetMode === "system" ? getSystemMode() : targetMode;
    document.documentElement.classList.add("DropletTheme");
    document.documentElement.setAttribute(THEME_ATTRIBUTE, nextResolvedMode);
    setResolvedMode(nextResolvedMode);
  }, []);

  useEffect(() => {
    const safeInitialTheme = getStoredMode();

    setModeState(safeInitialTheme);
    applyTheme(safeInitialTheme);
  }, [applyTheme, setModeState]);

  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", onSystemThemeChange);

    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [applyTheme, mode]);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      setModeState(nextMode);
      persistMode(nextMode);
      applyTheme(nextMode);
    },
    [applyTheme, setModeState],
  );

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
    }),
    [mode, resolvedMode, setMode],
  );

  return (
    <DropletThemeContext.Provider value={contextValue}>
      {children}
    </DropletThemeContext.Provider>
  );
}
