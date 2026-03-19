"use client";

import { useEffect } from "react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_LINKS } from "@/constants/admin";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";

export default function AdminSidebar() {
  const pathname = usePathname();
  const {
    desktopSidebarCollapsed: desktopCollapsed,
    mobileSidebarOpen: mobileOpen,
    setMobileSidebarOpen,
  } = useUiStore(
    useShallow((state) => ({
      desktopSidebarCollapsed: state.desktopSidebarCollapsed,
      mobileSidebarOpen: state.mobileSidebarOpen,
      setMobileSidebarOpen: state.setMobileSidebarOpen,
    })),
  );

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const sidebarClass = classNames(
    "AdminSidebar fixed bottom-0 left-0 top-0 z-30 flex w-72 flex-col justify-between",
    "border-r border-slate-300/70 bg-lavenderHaze-200 shadow-xl transition-all duration-300",
    "lg:relative lg:z-10 lg:translate-x-0 lg:shadow-none",
    "dark:border-slate-500 dark:bg-nightIndigo-1000",
    mobileOpen ? "translate-x-0" : "-translate-x-full",
    desktopCollapsed ? "lg:w-[78px]" : "lg:w-72",
  );

  const isOpen = !desktopCollapsed;

  const backdropClass = classNames(
    "fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] lg:hidden",
    !mobileOpen && "hidden",
  );

  return (
    <>
      <button
        type="button"
        className={backdropClass}
        onClick={() => setMobileSidebarOpen(false)}
        aria-label="Close sidebar overlay"
      />

      <aside className={sidebarClass} id="admin-sidebar">
        <div className="flex flex-col px-4 py-6">
          <div
            className={classNames(
              "mb-8 flex flex-col gap-1 px-2",
              !isOpen && "lg:items-center lg:px-0",
            )}
          >
            <p
              className={classNames(
                "text-xs font-semibold uppercase tracking-[0.28em] opacity-60",
                !isOpen && "lg:hidden",
              )}
            >
              Droplet
            </p>
            <h2 className={classNames("heading-5", !isOpen && "lg:hidden")}>
              Admin Panel
            </h2>
            {!isOpen && (
              <span className="hidden text-lg font-bold lg:block">D</span>
            )}
          </div>

          <nav
            className={classNames(
              "droplet-scrollbar flex flex-col gap-2 overflow-y-auto",
              !isOpen && "lg:items-center",
            )}
          >
            {ADMIN_LINKS.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={!isOpen ? link.label : undefined}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all",
                    "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                    isActive &&
                      "bg-lavenderHaze-100 font-semibold dark:bg-nightIndigo-500/25",
                    !isOpen && "lg:w-auto lg:justify-center lg:px-2",
                  )}
                >
                  <i className={classNames(link.icon, "text-base")}></i>
                  <span className={classNames(!isOpen && "lg:hidden")}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={classNames(
            "px-6 pb-6 text-xs opacity-70",
            !isOpen && "lg:hidden",
          )}
        >
          <p>Protected by proxy and server layers.</p>
        </div>
      </aside>
    </>
  );
}
