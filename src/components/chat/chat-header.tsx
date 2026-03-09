"use client";

import classNames from "classnames";
import { TooltipArrow } from "@/components/shared/tooltip-arrow";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";

interface ChatHeaderProps {
  className?: string;
  isInUse?: boolean;
  setNewTask?: () => void;
  assistantRoleLabel?: string;
  messageCount?: number;
}

export default function ChatHeader({
  className: style = "",
  setNewTask,
  isInUse = false,
  assistantRoleLabel,
  messageCount = 0,
}: ChatHeaderProps) {
  const chatHeaderClass = classNames(
    "ChatHeader absolute left-0 right-0 top-0 z-20 flex w-full px-3",
    "border-b border-lightBorders-300/70 bg-lightPrimary-100/85 shadow-sm backdrop-blur-lg",
    "dark:border-darkBorders-500 dark:bg-darkPrimary-900/55",
    style,
  );

  const hasChatControls = Boolean(setNewTask);

  return (
    <section className={chatHeaderClass}>
      <div className="mx-auto flex w-full items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-2">
          {hasChatControls && (
            <TooltipArrow
              title={isInUse ? "Wait for current answer" : "New conversation"}
              placement="right"
              className="transition-all"
            >
              <span>
                <button
                  type="button"
                  onClick={setNewTask}
                  disabled={isInUse}
                  className="icon-btn"
                  aria-label="Start new conversation"
                >
                  <i className="bi bi-plus-circle-dotted"></i>
                </button>
              </span>
            </TooltipArrow>
          )}

          {assistantRoleLabel && (
            <div className="flex items-center gap-2 rounded-full border border-dotted px-2.5 py-1 text-xs">
              <span className="font-semibold">{assistantRoleLabel}</span>
              <span className="opacity-65">Role</span>
            </div>
          )}

          {messageCount > 0 && (
            <div className="hidden rounded-full border border-dotted px-2.5 py-1 text-xs opacity-80 md:flex">
              {messageCount} messages
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
