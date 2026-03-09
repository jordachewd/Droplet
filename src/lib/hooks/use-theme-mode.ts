"use client";

import {
  CellesseonThemeContext,
  ThemeMode,
} from "@/components/layout/cellesseon-theme";
import { useContext } from "react";

export default function useThemeMode() {
  const context = useContext(CellesseonThemeContext);

  if (!context) {
    throw new Error("useThemeMode must be used within CellesseonTheme");
  }

  const { mode, resolvedMode, setMode } = context;
  const safeMode: ThemeMode | undefined = mode;

  return { mode: safeMode, resolvedMode, setMode };
}
