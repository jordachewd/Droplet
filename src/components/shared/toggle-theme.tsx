"use client";

import classNames from "classnames";
import { TooltipArrow } from "./tooltip-arrow";
import useThemeMode from "@/lib/hooks/use-theme-mode";

export default function ToggleTheme() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  const lightActive =
    mode === "light" || (mode === "system" && resolvedMode === "light");

  const darkActive =
    mode === "dark" || (mode === "system" && resolvedMode === "dark");

  const toggleThemeClass = classNames(
    "ToggleTheme inline-flex items-center rounded-lg p-1",
    "bg-lightBackground-100/70 dark:bg-darkBackground-900/50",
  );

  const lightButtonClass = classNames(
    "icon-btn",
    lightActive
      ? "bg-lightBackground-200 dark:bg-darkBackground-500/50"
      : "bg-transparent",
  );

  const darkButtonClass = classNames(
    "icon-btn",
    darkActive
      ? "bg-lightBackground-200 dark:bg-darkBackground-500/50"
      : "bg-transparent",
  );

  return (
    <div className={toggleThemeClass}>
      <TooltipArrow title="Light" placement="bottom">
        <button
          type="button"
          onClick={() => setMode("light")}
          className={lightButtonClass}
          aria-label="Switch to light mode"
        >
          <i className="bi bi-sun text-sm" />
        </button>
      </TooltipArrow>
      <TooltipArrow title="Dark" placement="bottom">
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={darkButtonClass}
          aria-label="Switch to dark mode"
        >
          <i className="bi bi-moon-stars text-sm" />
        </button>
      </TooltipArrow>
    </div>
  );
}
