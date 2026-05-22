"use client";

import ThemeSwitchSvg from "./ThemeSwitchSvg";
import { TooltipArrow } from "./TooltipArrow";
import useThemeMode from "@/lib/hooks/use-theme-mode";

export default function ThemeSwitch() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  const systemMode = mode === "system" && resolvedMode === "dark";
  const darkActive = mode === "dark" || systemMode;
  const tooltipTitle = darkActive ? "Light Mode" : "Dark Mode";
  const activeClass = darkActive ? "translate-x-7 " : "translate-x-0";

  const handleToggleTheme = () => {
    setMode(darkActive ? "light" : "dark");
  };

  return (
    <TooltipArrow title={tooltipTitle} placement="bottom">
      <button
        className="app-theme-switch"
        type="button"
        role="switch"
        aria-checked={darkActive}
        aria-label="Toggle theme mode"
        onClick={handleToggleTheme}
      >
        <span className="sr-only">{tooltipTitle}</span>

        <span aria-hidden="true" className="app-theme-switch--on">
          <ThemeSwitchSvg mode="light" className="app-theme-switch--svg" />
        </span>

        <span aria-hidden="true" className="app-theme-switch--off">
          <ThemeSwitchSvg mode="dark" className="app-theme-switch--svg" />
        </span>

        <span
          aria-hidden="true"
          className={`app-theme-switch--active ${activeClass}`}
        >
          {darkActive ? (
            <ThemeSwitchSvg
              mode="dark"
              className="app-theme-switch--svg-active"
            />
          ) : (
            <ThemeSwitchSvg
              mode="light"
              className="app-theme-switch--svg-active"
            />
          )}
        </span>
      </button>
    </TooltipArrow>
  );
}
