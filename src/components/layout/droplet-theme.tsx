"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

const getInitialMode = (): ThemeMode => "system";

const persistMode = (nextMode: ThemeMode) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  } catch {
    // Ignore storage access errors; theme still applies for this session.
  }
};

export default function DropletTheme({ children }: ThemeProps) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>("light");
  const resolvedMode: ResolvedThemeMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    document.documentElement.classList.add("DropletTheme");
    if (!document.documentElement.hasAttribute(THEME_ATTRIBUTE)) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, "light");
    }
  }, []);

  useEffect(() => {
    const storedMode = getStoredMode();
    const nextSystemMode = getSystemMode();
    const syncThemeState = window.setTimeout(() => {
      setSystemMode(nextSystemMode);
      if (storedMode !== "system") {
        setModeState(storedMode);
      }
      setHasHydratedTheme(true);
    }, 0);

    return () => window.clearTimeout(syncThemeState);
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) return;

    document.documentElement.classList.add("DropletTheme");
    document.documentElement.setAttribute(THEME_ATTRIBUTE, resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      setModeState(getStoredMode());
      setSystemMode(getSystemMode());
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      setSystemMode(getSystemMode());
    };
    mediaQuery.addEventListener("change", onSystemThemeChange);

    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    persistMode(nextMode);

    if (nextMode === "system") {
      setSystemMode(getSystemMode());
    }
  }, []);

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
