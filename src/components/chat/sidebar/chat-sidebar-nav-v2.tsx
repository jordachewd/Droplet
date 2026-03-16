"use client";

import Link from "next/link";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConversationListItem } from "@/types/PersonaData.d";
import { getPersona } from "@/constants/assistant-personas";
import { deleteTask } from "@/lib/actions/task.actions";

interface ChatSidebarNavV2Props {
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
  { href: "/app/personas", label: "Personas", icon: "bi bi-grid-3x3-gap" },
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

export default function ChatSidebarNavV2({
  isOpen,
  historyItems,
}: ChatSidebarNavV2Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversationItems, setConversationItems] =
    useState<ConversationListItem[]>(historyItems);
  const [deletingConversationId, setDeletingConversationId] = useState<
    string | null
  >(null);
  const headingClass = classNames(
    "px-2.5 text-xxs font-semibold uppercase tracking-wide opacity-65",
    !isOpen && "lg:hidden",
  );

  useEffect(() => {
    setConversationItems(historyItems);
  }, [historyItems]);

  async function handleDeleteConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${item.title}"? This cannot be undone.`,
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingConversationId(item.id);

    try {
      const result = (await deleteTask(item.id)) as
        | {
            status?: number;
            message?: string;
          }
        | undefined;

      if (result?.status !== 200) {
        window.alert(result?.message || "Conversation deletion failed.");
        return;
      }

      setConversationItems((currentItems) =>
        currentItems.filter((entry) => entry.id !== item.id),
      );

      if (pathname === item.href) {
        router.replace("/app");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Conversation deletion failed.");
    } finally {
      setDeletingConversationId(null);
    }
  }

  return (
    <nav className="ChatSidebarNavV2 mb-auto flex flex-col gap-6 px-3 py-4">
      <section className="ChatSidebarNavV2Section flex flex-col gap-1.5">
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

      <section className="ChatSidebarNavV2Section flex flex-col gap-1.5">
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

      <section className="ChatSidebarNavV2Section flex flex-col gap-1.5">
        <p className={headingClass}>Recent</p>
        <div className="flex flex-col gap-1">
          {conversationItems.length === 0 && (
            <p
              className={classNames(
                "px-2.5 py-2 text-xs opacity-65",
                !isOpen && "lg:hidden",
              )}
            >
              No saved conversations yet.
            </p>
          )}
          {conversationItems.slice(0, 6).map((item) => {
            const persona = getPersona(item.personaId);
            const isActive = pathname === item.href;
            const isDeleting = deletingConversationId === item.id;
            const isDeleteDisabled =
              Boolean(deletingConversationId) || item.isDemo;
            const deleteLabel = item.isDemo
              ? `Delete unavailable for demo conversation ${item.title}`
              : `Delete ${item.title}`;

            return (
              <div
                key={item.id}
                className={classNames(
                  "group flex w-full items-center gap-1",
                  !isOpen && "lg:justify-center",
                )}
              >
                <Link
                  href={item.href}
                  className={classNames(
                    "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                    "hover:bg-lightSecondary-300/70 dark:hover:bg-darkSecondary-500/30",
                    isActive &&
                      "bg-lightPrimary-100 dark:bg-darkPrimary-500/25",
                    !isOpen && "lg:flex-1 lg:justify-center lg:px-2",
                  )}
                >
                  <i
                    className={classNames(persona.icon, "shrink-0 text-sm")}
                  ></i>
                  <div
                    className={classNames("min-w-0", !isOpen && "lg:hidden")}
                  >
                    <p className="truncate text-xs font-medium">{item.title}</p>
                    <p className="truncate text-xxs opacity-70">
                      {persona.label} - {item.updatedAtLabel}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  className={classNames(
                    "SidebarDeleteBtn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-xs opacity-65 transition-all",
                    "hover:border-lightBorders-400 hover:bg-lightSecondary-300/70 hover:opacity-100",
                    "focus-visible:border-lightPrimary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lightPrimary-300/60",
                    "dark:hover:border-darkBorders-500 dark:hover:bg-darkSecondary-500/30",
                    "dark:focus-visible:border-darkPrimary-400 dark:focus-visible:ring-darkPrimary-500/40",
                    isDeleteDisabled &&
                      "cursor-not-allowed opacity-35 hover:border-transparent hover:bg-transparent",
                  )}
                  onClick={() => void handleDeleteConversation(item)}
                  disabled={isDeleteDisabled}
                  aria-label={deleteLabel}
                  title={
                    item.isDemo
                      ? "Demo conversations cannot be deleted"
                      : "Delete conversation"
                  }
                >
                  <i
                    className={classNames(
                      isDeleting
                        ? "bi bi-arrow-repeat animate-spin"
                        : "bi bi-trash3",
                      "text-sm",
                    )}
                  ></i>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </nav>
  );
}
