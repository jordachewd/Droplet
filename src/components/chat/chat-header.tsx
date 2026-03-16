"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { useShallow } from "zustand/react/shallow";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import SidebarToggle from "@/components/shared/sidebar-toggle";
import { useChatStore } from "@/lib/hooks/use-chat-store";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { getPersona } from "@/constants/assistant-personas";

interface ChatHeaderProps {
  className?: string;
}

export default function ChatHeader({ className: style = "" }: ChatHeaderProps) {
  const { messages, taskStatus, personaId } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      taskStatus: state.taskStatus,
      personaId: state.personaId,
    })),
  );

  const {
    desktopSidebarCollapsed,
    mobileSidebarOpen,
    toggleDesktopSidebarCollapsed,
    toggleMobileSidebarOpen,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      mobileSidebarOpen: state.mobileSidebarOpen,
      toggleDesktopSidebarCollapsed: state.toggleDesktopSidebarCollapsed,
      toggleMobileSidebarOpen: state.toggleMobileSidebarOpen,
    })),
  );

  const desktopQueryRef = useRef<MediaQueryList | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    desktopQueryRef.current = mql;
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  function handleToggleSidebar() {
    if (desktopQueryRef.current?.matches) {
      toggleDesktopSidebarCollapsed();
    } else {
      toggleMobileSidebarOpen();
    }
  }

  const personaLabel = personaId ? getPersona(personaId).label : undefined;
  const messageCount = messages.length;
  const sidebarExpanded = isDesktop
    ? !desktopSidebarCollapsed
    : mobileSidebarOpen;

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
          <SidebarToggle
            icon="bi-layout-sidebar"
            title={sidebarExpanded ? "Hide menu" : "Show menu"}
            toggleSidebar={handleToggleSidebar}
            expanded={sidebarExpanded}
            controlsId="chat-sidebar"
          />

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

          {taskStatus === "ended" && (
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
