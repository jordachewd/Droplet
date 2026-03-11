"use client";

import classNames from "classnames";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import { TaskStatus } from "@/types/TaskData.d";

interface ChatHeaderProps {
  className?: string;
  personaLabel?: string;
  messageCount?: number;
  conversationStatus?: TaskStatus;
}

export default function ChatHeader({
  className: style = "",
  personaLabel,
  messageCount = 0,
  conversationStatus = "active",
}: ChatHeaderProps) {
  const chatHeaderClass = classNames(
    "ChatHeader absolute left-0 right-0 top-0 z-20 flex w-full px-3",
    "border-b border-lightBorders-300/70 bg-lightPrimary-100/85 shadow-sm backdrop-blur-lg",
    "dark:border-darkBorders-500 dark:bg-darkPrimary-900/55",
    style,
  );

  return (
    <section className={chatHeaderClass}>
      <div className="mx-auto flex w-full items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-2">
          {personaLabel && (
            <div className="flex items-center gap-2 rounded-full border border-dotted px-2.5 py-1 text-xs">
              <span className="font-semibold">{personaLabel}</span>
              <span className="opacity-65">Persona</span>
            </div>
          )}

          {messageCount > 0 && (
            <div className="hidden rounded-full border border-dotted px-2.5 py-1 text-xs opacity-80 md:flex">
              {messageCount} messages
            </div>
          )}

          {conversationStatus === "ended" && (
            <div className="flex rounded-full border border-amber-500/60 bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100">
              Conversation ended
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ToggleTheme />
          <AvatarMenu />
        </div>
      </div>
    </section>
  );
}
