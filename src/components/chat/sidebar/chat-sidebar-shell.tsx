"use client";

import { useEffect } from "react";
import classNames from "classnames";
import { PromoContent } from "@/constants/promo-content";
import SidebarHead from "@/components/chat/sidebar/sidebar-head";
import ChatSidebarNav from "@/components/chat/sidebar/chat-sidebar-nav";
import ChatSidebarPromo from "@/components/chat/sidebar/chat-sidebar-promo";
import { ConversationListItem } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";
import { usePathname } from "next/navigation";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";

interface ChatSidebarShellProps {
  historyItems: ConversationListItem[];
  userRole?: UserRoles;
  userPlanName?: PlanName | null;
  isSuspended?: boolean;
  promoContent?: PromoContent;
}

export default function ChatSidebarShell({
  historyItems,
  userRole,
  userPlanName,
  isSuspended,
  promoContent,
}: ChatSidebarShellProps) {
  const sidebarStorageKey = "droplet-sidebar-collapsed";
  const isDesktopViewport = useIsDesktop();
  const {
    desktopSidebarCollapsed: desktopCollapsed,
    mobileSidebarOpen: mobileOpen,
    setDesktopSidebarCollapsed,
    setMobileSidebarOpen,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      mobileSidebarOpen: state.mobileSidebarOpen,
      setDesktopSidebarCollapsed: state.setDesktopSidebarCollapsed,
      setMobileSidebarOpen: state.setMobileSidebarOpen,
    })),
  );
  const pathname = usePathname();

  useEffect(() => {
    try {
      const collapsedFromStorage = localStorage.getItem(sidebarStorageKey);
      setDesktopSidebarCollapsed(collapsedFromStorage === "true");
    } catch (error) {
      void error;
      setDesktopSidebarCollapsed(false);
    }
  }, [setDesktopSidebarCollapsed, sidebarStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(desktopCollapsed));
    } catch (error) {
      void error;
      // localStorage quota exceeded or unavailable - non-critical UI preference write.
    }
  }, [desktopCollapsed, sidebarStorageKey]);

  useEffect(() => {
    if (isDesktopViewport) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktopViewport, setMobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const isSidebarOpen = isDesktopViewport ? !desktopCollapsed : mobileOpen;

  function handleCloseMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  const chatSidebarClass = classNames(
    "ChatSidebar app-sidebar justify-between transition-all duration-300 lg:translate-x-0",
    mobileOpen ? "translate-x-0" : "-translate-x-full",
    desktopCollapsed ? "lg:w-16" : "lg:w-56",
  );

  const navWrapperClass = classNames(
    "flex min-h-0 flex-1 flex-col overflow-y-auto",
    !isSidebarOpen && "lg:items-center",
  );

  const sidebarBackdropClass = classNames(
    "sidebar-backdrop",
    !mobileOpen && "hidden",
  );

  return (
    <>
      <button
        type="button"
        className={sidebarBackdropClass}
        onClick={handleCloseMobileSidebar}
        aria-label="Close sidebar overlay"
      />

      <aside className={chatSidebarClass} id="chat-sidebar">
        <SidebarHead isDesktopCollapsed={desktopCollapsed} />

        <div className={navWrapperClass}>
          <ChatSidebarNav isOpen={isSidebarOpen} historyItems={historyItems} />
        </div>

        <ChatSidebarPromo
          isOpen={isSidebarOpen}
          userRole={userRole}
          planName={userPlanName}
          isSuspended={isSuspended}
          promoContent={promoContent}
        />
      </aside>
    </>
  );
}
