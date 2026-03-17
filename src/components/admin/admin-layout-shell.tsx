"use client";

import { useEffect, useRef, useState } from "react";
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
}

export default function AdminLayoutShell({ children }: AdminLayoutShellProps) {
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    desktopQueryRef.current = mql;
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  function handleToggleSidebar() {
    if (desktopQueryRef.current?.matches) {
      toggleDesktopSidebarCollapsed();
    } else {
      toggleMobileSidebarOpen();
    }
  }

  const sidebarExpanded = isDesktop
    ? !desktopSidebarCollapsed
    : mobileSidebarOpen;

  return (
    <section className="AdminLayoutShell flex min-h-dvh w-full bg-lightBackground-200 dark:bg-darkBackground-1000">
      <AdminSidebar />

      <div className="flex min-h-dvh flex-1 flex-col">
        <header
          className={classNames(
            "AdminLayoutHeader flex items-center justify-between px-3",
            "border-b border-slate-300/70 bg-lightBackground-100/85 backdrop-blur-lg",
            "dark:border-slate-500 dark:bg-darkBackground-900/55",
          )}
        >
          <div className="flex items-center gap-2">
            <SidebarToggle
              icon="bi-layout-sidebar"
              title={sidebarExpanded ? "Hide menu" : "Show menu"}
              toggleSidebar={handleToggleSidebar}
              expanded={sidebarExpanded}
              controlsId="admin-sidebar"
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-xxs font-semibold uppercase tracking-[0.28em] opacity-60">
                Operations
              </p>
              <h1 className="text-sm font-semibold">Admin Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <Link className="btn btn-sm btn-outlined" href="/app">
              Open App
            </Link>
            <ToggleTheme />
            <AvatarMenu />
          </div>
        </header>

        <main className="AdminLayoutMain droplet-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </section>
  );
}
