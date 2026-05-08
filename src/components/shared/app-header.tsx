"use client";

import classNames from "classnames";
import { ReactNode } from "react";
import AvatarMenu from "@/components/shared/avatar-menu";
import ToggleTheme from "@/components/shared/ToggleTheme";

type AppHeaderElement = "header" | "section";

interface AppHeaderProps {
  as?: AppHeaderElement;
  className?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export default function AppHeader({
  as: Element = "section",
  className,
  leftSlot,
  rightSlot,
}: AppHeaderProps) {
  const appHeaderClass = classNames("AppHeader app-header-bar", className);

  return (
    <Element className={appHeaderClass}>
      <div className="app-header-inner">
        <div className="flex items-center gap-2">{leftSlot ?? null}</div>

        <div className="ml-auto flex items-center gap-2">
          {rightSlot ?? null}
          <ToggleTheme />
          <AvatarMenu />
        </div>
      </div>
    </Element>
  );
}
