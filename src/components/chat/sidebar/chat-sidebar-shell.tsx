"use client";

import { useEffect, useState } from "react";
import classNames from "classnames";
import SidebarHead from "@/components/chat/sidebar/sidebar-head";
import ChatSidebarNavV2 from "@/components/chat/sidebar/chat-sidebar-nav-v2";
import ChatSidebarPromo from "@/components/chat/sidebar/chat-sidebar-promo";
import { ConversationListItem } from "@/types/PersonaData.d";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";

interface ChatSidebarShellProps {
  historyItems: ConversationListItem[];
}

export default function ChatSidebarShell({
  historyItems,
}: ChatSidebarShellProps) {
  const sidebarStorageKey = "droplet-sidebar-collapsed";
  const legacySidebarStorageKey = "cellesseon-sidebar-collapsed";
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
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
      const collapsedFromStorage =
        localStorage.getItem(sidebarStorageKey) ??
        localStorage.getItem(legacySidebarStorageKey);
      setDesktopSidebarCollapsed(collapsedFromStorage === "true");
    } catch {
      setDesktopSidebarCollapsed(false);
    }
  }, [legacySidebarStorageKey, setDesktopSidebarCollapsed, sidebarStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(desktopCollapsed));
    } catch {}
  }, [desktopCollapsed, sidebarStorageKey]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    setIsDesktopViewport(desktopQuery.matches);

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches);
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    };

    desktopQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      desktopQuery.removeEventListener("change", handleBreakpointChange);
    };
  }, [setMobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const isSidebarOpen = isDesktopViewport ? !desktopCollapsed : mobileOpen;

  function handleCloseMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  const chatSidebarClass = classNames(
    "ChatSidebar fixed bottom-0 left-0 top-0 z-30 flex w-72 flex-col justify-between",
    "border-r border-lightBorders-400 bg-lightBackground-200 shadow-xl transition-all duration-300",
    "lg:relative lg:z-10 lg:translate-x-0 lg:shadow-none",
    "dark:border-darkBorders-500 dark:bg-jwdMarine-1000",
    mobileOpen ? "translate-x-0" : "-translate-x-full",
    desktopCollapsed ? "lg:w-[78px]" : "lg:w-72",
  );

  const navWrapperClass = classNames(
    "droplet-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto",
    !isSidebarOpen && "lg:items-center",
  );

  const sidebarBackdropClass = classNames(
    "fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] lg:hidden",
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
          <ChatSidebarNavV2
            isOpen={isSidebarOpen}
            historyItems={historyItems}
          />
        </div>

        <ChatSidebarPromo isOpen={isSidebarOpen} />
      </aside>
    </>
  );
}
