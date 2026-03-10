"use client";

import Logo from "@/components/shared/app-logo";
import SidebarToggle from "@/components/shared/sidebar-toggle";

interface SidebarHeadProps {
  isOpen: boolean;
  onToggleSidebar: () => void;
  isDesktopCollapsed?: boolean;
}

export default function SidebarHead({
  isOpen,
  onToggleSidebar,
  isDesktopCollapsed = false,
}: SidebarHeadProps) {
  return (
    <div className="ChatSidebarHead flex w-full items-center gap-2 bg-lightPrimary-100 p-3 dark:bg-darkPrimary-1000">
      <Logo className={isDesktopCollapsed ? "lg:hidden" : ""} />
      {isDesktopCollapsed && <Logo className="hidden lg:flex" size={26} />}

      <div className="ChatSidebarHeadToggle flex rounded-md p-1">
        <SidebarToggle
          icon="bi-layout-sidebar"
          title={isOpen ? "Hide menu" : "Show menu"}
          toggleSidebar={onToggleSidebar}
          expanded={isOpen}
          controlsId="chat-sidebar"
        />
      </div>
    </div>
  );
}
