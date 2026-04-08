"use client";

import classNames from "classnames";
import { useShallow } from "zustand/react/shallow";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import SidebarToggle from "@/components/shared/sidebar-toggle";
import { useChatStore } from "@/lib/hooks/use-chat-store";
import { useUiStore } from "@/lib/hooks/use-ui-store";

interface ChatHeaderProps {
  className?: string;
}

export default function ChatHeader({ className: style = "" }: ChatHeaderProps) {
  const { messages, taskStatus } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      taskStatus: state.taskStatus,
    })),
  );

  const { mobileSidebarOpen, toggleMobileSidebarOpen } = useUiStore(
    useShallow((state) => ({
      mobileSidebarOpen: state.mobileSidebarOpen,
      toggleMobileSidebarOpen: state.toggleMobileSidebarOpen,
    })),
  );

  const messageCount = messages.length;

  const chatHeaderClass = classNames("ChatHeader app-header-bar", style);

  return (
    <section className={chatHeaderClass}>
      <div className="app-header-inner">
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <SidebarToggle
              icon="bi-layout-sidebar"
              title={mobileSidebarOpen ? "Hide menu" : "Show menu"}
              toggleSidebar={toggleMobileSidebarOpen}
              expanded={mobileSidebarOpen}
              controlsId="chat-sidebar"
            />
          </div>

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
