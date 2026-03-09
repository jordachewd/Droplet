"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface ThemeProps {
  children: ReactNode;
}

export type ThemeMode = "system" | "light" | "dark";
type ResolvedThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (nextMode: ThemeMode) => void;
}

const STORAGE_KEY = "cellesseon-theme-mode";

export const CellesseonThemeContext = createContext<ThemeContextValue | null>(
  null,
);

const getSystemMode = (): ResolvedThemeMode =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getStoredMode = (): ThemeMode => {
  try {
    const storedThemeMode = window.localStorage.getItem(STORAGE_KEY);

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

export default function CellesseonTheme({ children }: ThemeProps) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>("light");

  const applyTheme = useCallback((targetMode: ThemeMode) => {
    const nextResolvedMode =
      targetMode === "system" ? getSystemMode() : targetMode;
    document.documentElement.classList.add("CellesseonTheme");
    document.documentElement.setAttribute(
      "data-cellesseon-theme",
      nextResolvedMode,
    );
    setResolvedMode(nextResolvedMode);
  }, []);

  useEffect(() => {
    const safeInitialTheme = getStoredMode();

    setModeState(safeInitialTheme);
    applyTheme(safeInitialTheme);
  }, [applyTheme]);

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
    [applyTheme],
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
    <CellesseonThemeContext.Provider value={contextValue}>
      {children}
    </CellesseonThemeContext.Provider>
  );
}
