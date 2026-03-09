"use client";

import Link from "next/link";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { ConversationListItem } from "@/types/AssistantRoleData.d";
import { getAssistantRole } from "@/constants/assistant-roles";

interface ChatSidebarNavProps {
  isOpen: boolean;
  historyItems: ConversationListItem[];
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const WORKSPACE_LINKS: NavLinkItem[] = [
  {
    href: "/app",
    label: "Chat Dashboard",
    icon: "bi bi-chat-dots",
    exact: true,
  },
  { href: "/app/new", label: "New Conversation", icon: "bi bi-plus-circle" },
  { href: "/app/library", label: "Library", icon: "bi bi-clock-history" },
];

const DISCOVER_LINKS: NavLinkItem[] = [
  { href: "/app/roles", label: "Roles", icon: "bi bi-grid-3x3-gap" },
  { href: "/plans", label: "Plans", icon: "bi bi-stars" },
  { href: "/profile", label: "Profile", icon: "bi bi-person" },
];

function SidebarNavLink({
  item,
  pathname,
  isOpen,
}: {
  item: NavLinkItem;
  pathname: string;
  isOpen: boolean;
}) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={classNames(
        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all",
        "hover:bg-lightSecondary-300/70 dark:hover:bg-darkSecondary-500/30",
        isActive &&
          "bg-lightPrimary-100 font-semibold dark:bg-darkPrimary-500/25",
        !isOpen && "lg:w-auto lg:justify-center lg:px-2",
      )}
    >
      <i className={classNames(item.icon, "text-base")}></i>
      <span className={classNames(!isOpen && "lg:hidden")}>{item.label}</span>
    </Link>
  );
}

export default function ChatSidebarNav({
  isOpen,
  historyItems,
}: ChatSidebarNavProps) {
  const pathname = usePathname();
  const headingClass = classNames(
    "px-2.5 text-xxs font-semibold uppercase tracking-wide opacity-65",
    !isOpen && "lg:hidden",
  );

  return (
    <nav className="ChatSidebarNav mb-auto flex flex-col gap-6 px-3 py-4">
      <section className="ChatSidebarNavSection flex flex-col gap-1.5">
        <p className={headingClass}>Workspace</p>
        {WORKSPACE_LINKS.map((link) => (
          <SidebarNavLink
            key={link.href}
            item={link}
            pathname={pathname}
            isOpen={isOpen}
          />
        ))}
      </section>

      <section className="ChatSidebarNavSection flex flex-col gap-1.5">
        <p className={headingClass}>Discover</p>
        {DISCOVER_LINKS.map((link) => (
          <SidebarNavLink
            key={link.href}
            item={link}
            pathname={pathname}
            isOpen={isOpen}
          />
        ))}
      </section>

      <section className="ChatSidebarNavSection flex flex-col gap-1.5">
        <p className={headingClass}>Recent</p>
        <div className="flex flex-col gap-1">
          {historyItems.slice(0, 6).map((item) => {
            const role = getAssistantRole(item.assistantRoleId);
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={classNames(
                  "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                  "hover:bg-lightSecondary-300/70 dark:hover:bg-darkSecondary-500/30",
                  isActive && "bg-lightPrimary-100 dark:bg-darkPrimary-500/25",
                  !isOpen && "lg:w-auto lg:justify-center lg:px-2",
                )}
              >
                <i className={classNames(role.icon, "text-sm")}></i>
                <div className={classNames("min-w-0", !isOpen && "lg:hidden")}>
                  <p className="truncate text-xs font-medium">{item.title}</p>
                  <p className="truncate text-xxs opacity-70">
                    {role.label} · {item.updatedAtLabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </nav>
  );
}
