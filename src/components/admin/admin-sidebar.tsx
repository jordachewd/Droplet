"use client";

import { useEffect } from "react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/hooks/use-ui-store";
import { useShallow } from "zustand/react/shallow";
import Logo from "../shared/app-logo";

interface AdminSidebarLink {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface AdminSidebarProps {
  links: AdminSidebarLink[];
}

export default function AdminSidebar({ links }: AdminSidebarProps) {
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
    "AdminSidebar app-sidebar justify-between transition-all duration-300 lg:translate-x-0",
    mobileOpen ? "translate-x-0" : "-translate-x-full",
    desktopCollapsed ? "lg:w-16" : "lg:w-72",
  );

  const isOpen = !desktopCollapsed;

  const backdropClass = classNames("sidebar-backdrop", !mobileOpen && "hidden");

  return (
    <>
      <button
        type="button"
        className={backdropClass}
        onClick={() => setMobileSidebarOpen(false)}
        aria-label="Close sidebar overlay"
      />

      <aside className={sidebarClass} id="admin-sidebar">
        <div
          className={classNames(
            "AdminSidebarHead flex flex-col w-full px-4 h-14 justify-center",
            "bg-lavenderHaze-500 dark:bg-nightIndigo-500",
            !isOpen && "lg:hidden",
          )}
        >
          <h2 className="heading-6 leading-tight">Admin Control</h2>
          <p className="text-xxs text-midnightBlue-500/50 dark:text-lavenderHaze-500/50">
            Operational Command Center
          </p>
        </div>

        <div className="AdminSidebarNav flex flex-col flex-1 px-4 py-6">
          <nav
            aria-label="Admin navigation"
            className={classNames(
              "AdminSidebarNavItems flex flex-col gap-2 overflow-y-auto",
              !isOpen && "lg:items-center",
            )}
          >
            {links.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={!isOpen ? link.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={classNames(
                    "sidebar-nav-link",
                    "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                    isActive &&
                      "bg-lavenderHaze-100 font-semibold dark:bg-nightIndigo-500/25",
                    !isOpen && "lg:w-auto lg:justify-center lg:px-2",
                  )}
                >
                  <i
                    className={classNames(link.icon, "text-base")}
                    aria-hidden="true"
                  ></i>
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
            "AdminSidebarFooter p-4",
            !isOpen && "lg:hidden",
          )}
        >
          <Logo size={32} iconOnly={!isOpen} />
        </div>
      </aside>
    </>
  );
}
