"use client";

import { useEffect } from "react";
import classNames from "classnames";
import { PromoContent } from "@/constants/promo-content";
import SidebarHead from "@/components/chat/sidebar/sidebar-head";
import ChatSidebarNav from "@/components/chat/sidebar/chat-sidebar-nav";
import ChatSidebarPromo from "@/components/chat/sidebar/chat-sidebar-promo";
import SidebarShell from "@/components/shared/sidebar-shell";
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

export default function ChatSidebarShell({
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
    <SidebarShell
      id="chat-sidebar"
      expandedWidth="lg:w-56"
      className="ChatSidebar"
      header={({ isDesktopCollapsed }) => (
        <SidebarHead isDesktopCollapsed={isDesktopCollapsed} />
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
