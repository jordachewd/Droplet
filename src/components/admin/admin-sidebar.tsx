"use client";

import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "bi bi-speedometer2",
    exact: true,
  },
  { href: "/admin/users", label: "Users", icon: "bi bi-people" },
  {
    href: "/admin/transactions",
    label: "Transactions",
    icon: "bi bi-credit-card-2-front",
  },
  { href: "/admin/usage", label: "Usage", icon: "bi bi-graph-up-arrow" },
  { href: "/admin/settings", label: "Settings", icon: "bi bi-sliders" },
  {
    href: "/admin/website",
    label: "Website",
    icon: "bi bi-layout-text-window",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={classNames(
        "AdminSidebar hidden w-72 shrink-0 flex-col border-r px-4 py-6 lg:flex",
        "border-lightBorders-300 bg-white/70 dark:border-darkBorders-500 dark:bg-jwdMarine-950/70",
      )}
    >
      <div className="mb-8 flex flex-col gap-1 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-60">
          Droplet
        </p>
        <h2 className="heading-5">Admin Control Plane</h2>
      </div>

      <nav className="flex flex-col gap-2">
        {ADMIN_LINKS.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={classNames(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                "hover:bg-lightSecondary-300/70 dark:hover:bg-darkSecondary-500/30",
                isActive &&
                  "bg-lightPrimary-100 font-semibold dark:bg-darkPrimary-500/25",
              )}
            >
              <i className={classNames(link.icon, "text-base")}></i>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-6 text-xs opacity-70">
        <p>Admin pages are protected at the proxy and server layers.</p>
      </div>
    </aside>
  );
}
