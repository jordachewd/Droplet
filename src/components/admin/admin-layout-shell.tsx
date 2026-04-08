"use client";

import Link from "next/link";
import AdminSidebar from "@/components/admin/admin-sidebar";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import SidebarToggle from "@/components/shared/sidebar-toggle";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";

interface AdminLayoutShellProps {
  children: React.ReactNode;
  adminLinks: Array<{
    href: string;
    label: string;
    icon: string;
    exact?: boolean;
  }>;
}

export default function AdminLayoutShell({
  children,
  adminLinks,
}: AdminLayoutShellProps) {
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
    } else {
      toggleMobileSidebarOpen();
    }
  }

  const sidebarExpanded = isDesktop
    ? !desktopSidebarCollapsed
    : mobileSidebarOpen;

  return (
    <section className="AdminLayoutShell relative flex min-h-dvh w-full">
      <AdminSidebar links={adminLinks} />

      <div className="AdminMainWrapper relative flex flex-1 flex-col z-10 h-dvh w-full p-0 m-0 overflow-y-auto">
        <header className="AdminLayoutHeader app-header-bar">
          <div className="app-header-inner">
            <div className="flex items-center gap-2">
              <SidebarToggle
                icon="bi-layout-sidebar"
                title={sidebarExpanded ? "Hide menu" : "Show menu"}
                toggleSidebar={handleToggleSidebar}
                expanded={sidebarExpanded}
                controlsId="admin-sidebar"
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Link className="btn btn-sm btn-outlined" href="/app">
                Open App
              </Link>
              <ToggleTheme />
              <AvatarMenu />
            </div>
          </div>
        </header>

        <main
          id="admin-main-content"
          tabIndex={-1}
          className="AdminLayoutMain relative z-10 flex-1 overflow-y-auto px-4 pb-16 pt-28 -mt-14"
        >
          {children}
        </main>
      </div>
    </section>
  );
}
