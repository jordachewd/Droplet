"use client";

import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/shared/app-logo";
import SidebarShell from "@/components/shared/sidebar-shell";

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

  return (
    <SidebarShell
      id="admin-sidebar"
      expandedWidth="lg:w-72"
      className="AdminSidebar"
      header={({ isSidebarOpen }) => (
        <div
          className={classNames(
            "AdminSidebarHead flex flex-col w-full px-4 h-14 justify-center",
            "bg-lavenderHaze-500 dark:bg-nightIndigo-500",
            !isSidebarOpen && "lg:hidden",
          )}
        >
          <h2 className="heading-6 leading-tight">Admin Control</h2>
          <p className="text-xxs text-midnightBlue-500/50 dark:text-lavenderHaze-500/50">
            Operational Command Center
          </p>
        </div>
      )}
      navigation={({ isSidebarOpen }) => (
        <div className="AdminSidebarNav flex flex-col flex-1 px-4 py-6">
          <nav
            aria-label="Admin navigation"
            className={classNames(
              "AdminSidebarNavItems flex flex-col gap-2 overflow-y-auto",
              !isSidebarOpen && "lg:items-center",
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
                  title={!isSidebarOpen ? link.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={classNames(
                    "sidebar-nav-link",
                    "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                    isActive &&
                      "bg-lavenderHaze-100 font-semibold dark:bg-nightIndigo-500/25",
                    !isSidebarOpen && "lg:w-auto lg:justify-center lg:px-2",
                  )}
                >
                  <i
                    className={classNames(link.icon, "text-base")}
                    aria-hidden="true"
                  ></i>
                  <span className={classNames(!isSidebarOpen && "lg:hidden")}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      footer={({ isSidebarOpen }) => (
        <div
          className={classNames(
            "AdminSidebarFooter p-4",
            !isSidebarOpen && "lg:hidden",
          )}
        >
          <Logo size={32} iconOnly={!isSidebarOpen} />
        </div>
      )}
    />
  );
}
