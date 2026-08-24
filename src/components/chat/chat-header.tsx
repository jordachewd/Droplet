"use client";

import classNames from "classnames";
import { useShallow } from "zustand/react/shallow";
import AppHeader from "@/components/shared/app-header";
import SidebarToggle from "@/components/shared/SidebarToggle";
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

  return (
    <AppHeader
      as="section"
      className={classNames("ChatHeader", style)}
      leftSlot={
        <>
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
        </>
      }
    />
  );
}
