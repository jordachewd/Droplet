"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import classNames from "classnames";
import AdminSidebar from "@/components/admin/admin-sidebar";
import ToggleTheme from "@/components/shared/toggle-theme";
import AvatarMenu from "@/components/shared/avatar-menu";
import SidebarToggle from "@/components/shared/sidebar-toggle";
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

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeToDesktopQuery(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY);
  const handleChange = () => onStoreChange();
  mediaQueryList.addEventListener("change", handleChange);

  return () => {
    mediaQueryList.removeEventListener("change", handleChange);
  };
}

function getDesktopSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
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
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getDesktopSnapshot,
    () => false,
  );

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

      <div className="relative flex min-h-dvh flex-1 flex-col">
        <header
          className={classNames(
            "AdminLayoutHeader sticky left-0 right-0 top-0 z-20 flex w-full px-4",
            "bg-lavenderHaze-500/50 backdrop-blur-lg dark:bg-nightIndigo-500/50",
          )}
        >
          <div className="mx-auto flex w-full items-center justify-between gap-4 py-2.5">
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
          className="AdminLayoutMain relative z-10 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </section>
  );
}
