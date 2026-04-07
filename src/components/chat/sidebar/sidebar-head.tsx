"use client";

import { useRef, useSyncExternalStore } from "react";
import classNames from "classnames";
import Logo from "@/components/shared/app-logo";
import SidebarToggle from "@/components/shared/sidebar-toggle";
import { useShallow } from "zustand/react/shallow";
import { useUiStore } from "@/lib/hooks/use-ui-store";

interface SidebarHeadProps {
  isDesktopCollapsed?: boolean;
}

export default function SidebarHead({
  isDesktopCollapsed = false,
}: SidebarHeadProps) {
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
  const isDesktop = useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(min-width: 1024px)");
      desktopQueryRef.current = mql;
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );

  function handleToggleSidebar() {
    if (desktopQueryRef.current?.matches) {
      toggleDesktopSidebarCollapsed();
      return;
    }

    toggleMobileSidebarOpen();
  }

  const sidebarExpanded = isDesktop
    ? !desktopSidebarCollapsed
    : mobileSidebarOpen;
  const toggleVisibilityClass = classNames(
    "ml-auto transition-all duration-300",
    isDesktopCollapsed &&
      "lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100",
  );

  return (
    <div className="ChatSidebarHead group flex w-full items-center gap-2 px-4 py-3">
      <div
        className={classNames(
          "ChatSidebarHeadLogo flex min-w-0 items-center",
          isDesktopCollapsed && "lg:justify-center",
        )}
        tabIndex={isDesktopCollapsed ? 0 : undefined}
      >
        <Logo size={32} iconOnly={isDesktopCollapsed} />
      </div>

      <div className={toggleVisibilityClass}>
        <SidebarToggle
          icon="bi-layout-sidebar"
          title={sidebarExpanded ? "Hide menu" : "Show menu"}
          toggleSidebar={handleToggleSidebar}
          expanded={sidebarExpanded}
          controlsId="chat-sidebar"
        />
      </div>
    </div>
  );
}
