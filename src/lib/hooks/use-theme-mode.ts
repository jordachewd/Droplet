"use client";

import { DropletThemeContext } from "@/components/layout/droplet-theme";
import { ThemeMode } from "@/types/ThemeData.d";
import { useContext } from "react";

export default function useThemeMode() {
  const context = useContext(DropletThemeContext);

  if (!context) {
    throw new Error("useThemeMode must be used within DropletTheme");
  }

  const { mode, resolvedMode, setMode } = context;
  const safeMode: ThemeMode | undefined = mode;

  return { mode: safeMode, resolvedMode, setMode };
}
