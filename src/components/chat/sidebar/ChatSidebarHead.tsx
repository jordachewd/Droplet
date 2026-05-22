"use client";

import classNames from "classnames";
import Logo from "@/components/shared/app-logo";
import SidebarToggle from "@/components/shared/SidebarToggle";
import { useShallow } from "zustand/react/shallow";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { useUiStore } from "@/lib/hooks/use-ui-store";

interface SidebarHeadProps {
  isDesktopCollapsed?: boolean;
}

export default function ChatSidebarHead({
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
  const isDesktop = useIsDesktop();

  function handleToggleSidebar() {
    if (isDesktop) {
      toggleDesktopSidebarCollapsed();
      return;
    }

    toggleMobileSidebarOpen();
  }

  const logoClass = classNames("chat-sidebar-logo", {
    "justify-center": isDesktopCollapsed,
  });

  const isExpanded = isDesktop ? !desktopSidebarCollapsed : mobileSidebarOpen;

  const toggleVisibilityClass = classNames(
    "chat-sidebar-toggle",
    isDesktopCollapsed && "chat-sidebar-toggle--collapsed",
  );

  return (
    <div className="chat-sidebar-head group">
      <div className={logoClass} tabIndex={isDesktopCollapsed ? 0 : undefined}>
        <Logo size={32} iconOnly={isDesktopCollapsed} />
      </div>

      <div className={toggleVisibilityClass}>
        <SidebarToggle
          icon="bi-layout-sidebar"
          title={isExpanded ? "Hide menu" : "Show menu"}
          toggleSidebar={handleToggleSidebar}
          expanded={isExpanded}
          controlsId="chat-sidebar"
        />
      </div>
    </div>
  );
}
