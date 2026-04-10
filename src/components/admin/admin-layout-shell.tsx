"use client";

import Link from "next/link";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AppHeader from "@/components/shared/app-header";
import AppLayoutShell from "@/components/shared/app-layout-shell";
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
    <AppLayoutShell
      className="AdminLayoutShell"
      mainId="admin-layout"
      sidebar={<AdminSidebar links={adminLinks} />}
      header={
        <AppHeader
          as="header"
          className="AdminLayoutHeader"
          leftSlot={
            <SidebarToggle
              icon="bi-layout-sidebar"
              title={sidebarExpanded ? "Hide menu" : "Show menu"}
              toggleSidebar={handleToggleSidebar}
              expanded={sidebarExpanded}
              controlsId="admin-sidebar"
            />
          }
          rightSlot={
            <Link className="btn btn-sm btn-text" href="/app">
              App
            </Link>
          }
        />
      }
    >
      <div className="AdminLayoutMain relative z-10 flex-1 overflow-y-auto px-4 pb-16 pt-28 -mt-14">
        {children}
      </div>
    </AppLayoutShell>
  );
}
