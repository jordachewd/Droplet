"use client";

import { TooltipArrow } from "./tooltip-arrow";
import useThemeMode from "@/lib/hooks/use-theme-mode";

export default function ToggleTheme() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  const systemMode = mode === "system" && resolvedMode === "dark";
  const darkActive = mode === "dark" || systemMode;
  const tooltipTitle = darkActive ? "Light Mode" : "Dark Mode";

  const handleToggleTheme = () => {
    setMode(darkActive ? "light" : "dark");
  };

  return (
    <TooltipArrow title={tooltipTitle} placement="bottom">
      <button
        type="button"
        role="switch"
        aria-checked={darkActive}
        aria-label="Toggle theme mode"
        onClick={handleToggleTheme}
        className="ToggleTheme toggle-switch"
      >
        <span className="sr-only">{tooltipTitle}</span>

        <span aria-hidden="true" className="toggle-on">
          <svg viewBox="0 0 24 24" className="toggle-svg" fill="none">
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
            </g>
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
        </span>

        <span aria-hidden="true" className="toggle-off">
          <svg viewBox="0 0 24 24" className="toggle-svg" fill="currentColor">
            <path d="M15.1 14.9a6.2 6.2 0 0 1-6-6A6.79 6.79 0 0 1 9.9 4a.98.98 0 0 0-1.2-1.4A10.42 10.42 0 0 0 2 12.5c.2 5.1 4.4 9.3 9.5 9.5 4.5.2 8.5-2.6 9.9-6.6.3-.8-.6-1.7-1.4-1.2a6.78 6.78 0 0 1-4.9.7Z" />
          </svg>
        </span>

        <span
          aria-hidden="true"
          className={`toggle-active ${
            darkActive ? "translate-x-7 " : "translate-x-0"
          }`}
        >
          {darkActive ? (
            <svg
              viewBox="0 0 24 24"
              className="toggle-svg-active"
              fill="currentColor"
            >
              <path d="M15.1 14.9a6.2 6.2 0 0 1-6-6A6.79 6.79 0 0 1 9.9 4a.98.98 0 0 0-1.2-1.4A10.42 10.42 0 0 0 2 12.5c.2 5.1 4.4 9.3 9.5 9.5 4.5.2 8.5-2.6 9.9-6.6.3-.8-.6-1.7-1.4-1.2a6.78 6.78 0 0 1-4.9.7Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="toggle-svg-active" fill="none">
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
              </g>
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          )}
        </span>
      </button>
    </TooltipArrow>
  );
}
