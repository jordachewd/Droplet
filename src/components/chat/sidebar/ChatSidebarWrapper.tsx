"use client";

import { useEffect } from "react";
import classNames from "classnames";
import { PromoContent } from "@/constants/promo-content";
import ChatSidebarHead from "@/components/chat/sidebar/ChatSidebarHead";
import ChatSidebarNav from "@/components/chat/sidebar/ChatSidebarNav";
import ChatSidebarPromo from "@/components/chat/sidebar/ChatSidebarPromo";
import ChatSidebarShell from "@/components/chat/sidebar/ChatSidebarShell";
import { ConversationListItem } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";

interface ChatSidebarShellProps {
  historyItems: ConversationListItem[];
  userRole?: UserRoles;
  userPlanName?: PlanName | null;
  isSuspended?: boolean;
  promoContent?: PromoContent;
}

const SIDEBAR_STORAGE_KEY = "droplet-sidebar-collapsed";

export default function ChatSidebarWrapper({
  historyItems,
  userRole,
  userPlanName,
  isSuspended,
  promoContent,
}: ChatSidebarShellProps) {
  const {
    desktopSidebarCollapsed: desktopCollapsed,
    setDesktopSidebarCollapsed,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      setDesktopSidebarCollapsed: state.setDesktopSidebarCollapsed,
    })),
  );

  useEffect(() => {
    try {
      const collapsedFromStorage = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      setDesktopSidebarCollapsed(collapsedFromStorage === "true");
    } catch (error) {
      void error;
      setDesktopSidebarCollapsed(false);
    }
  }, [setDesktopSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(desktopCollapsed));
    } catch (error) {
      void error;
      // localStorage quota exceeded or unavailable - non-critical UI preference write.
    }
  }, [desktopCollapsed]);

  return (
    <ChatSidebarShell
      id="chat-sidebar"
      header={({ isDesktopCollapsed }) => (
        <ChatSidebarHead isDesktopCollapsed={isDesktopCollapsed} />
      )}
      navigation={({ isSidebarOpen }) => (
        <div
          className={classNames(
            "ChatSidebarNavWrapper flex min-h-0 flex-1 flex-col overflow-y-auto",
            !isSidebarOpen && "lg:items-center",
          )}
        >
          <ChatSidebarNav isOpen={isSidebarOpen} historyItems={historyItems} />
        </div>
      )}
      footer={({ isSidebarOpen }) => (
        <ChatSidebarPromo
          isOpen={isSidebarOpen}
          userRole={userRole}
          planName={userPlanName}
          isSuspended={isSuspended}
          promoContent={promoContent}
        />
      )}
    />
  );
}
