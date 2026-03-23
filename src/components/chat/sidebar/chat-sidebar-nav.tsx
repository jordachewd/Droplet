"use client";

import Link from "next/link";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AlertMessage from "@/components/shared/alert-message";
import ConfirmationModal from "@/components/shared/confirmation-modal";
import { ConversationListItem } from "@/types/PersonaData.d";
import { deleteTask } from "@/lib/actions/task.actions";

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
        "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
        isActive &&
          "bg-lavenderHaze-100 font-semibold dark:bg-nightIndigo-500/25",
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
  const router = useRouter();
  const [conversationItems, setConversationItems] =
    useState<ConversationListItem[]>(historyItems);
  const [deletingConversationId, setDeletingConversationId] = useState<
    string | null
  >(null);
  const [pendingDeleteItem, setPendingDeleteItem] =
    useState<ConversationListItem | null>(null);
  const [alert, setAlert] = useState<{
    id: number;
    title: string;
    text: string;
    severity: "success" | "error";
    variant: "outlined";
  } | null>(null);
  const headingClass = classNames(
    "px-2.5 text-xxs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700",
    !isOpen && "lg:hidden",
  );

  useEffect(() => {
    setConversationItems(historyItems);
  }, [historyItems]);

  async function handleDeleteConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId) {
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
        setAlert({
          id: Date.now(),
          title: "Delete failed",
          text: result?.message || "Conversation deletion failed.",
          severity: "error",
          variant: "outlined",
        });
        return;
      }

      setConversationItems((currentItems) =>
        currentItems.filter((entry) => entry.id !== item.id),
      );

      if (pathname === item.href) {
        setAlert({
          id: Date.now(),
          title: "Conversation removed",
          text: "Conversation deleted successfully.",
          severity: "success",
          variant: "outlined",
        });
        router.replace("/app");
        return;
      }

      setAlert({
        id: Date.now(),
        title: "Conversation removed",
        text: "Conversation deleted successfully.",
        severity: "success",
        variant: "outlined",
      });
      router.refresh();
    } catch {
      setAlert({
        id: Date.now(),
        title: "Delete failed",
        text: "Conversation deletion failed.",
        severity: "error",
        variant: "outlined",
      });
    } finally {
      setDeletingConversationId(null);
    }
  }

  function requestDeleteConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId) {
      return;
    }

    setPendingDeleteItem(item);
  }

  return (
    <nav className="ChatSidebarNav mb-auto flex flex-col gap-6 px-3 py-4">
      {alert ? <AlertMessage message={alert} /> : null}
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
        <p className={headingClass}>Recent</p>
        <div className="flex flex-col gap-1">
          {conversationItems.length === 0 && (
            <p
              className={classNames(
                "px-2.5 py-2 text-xs text-midnightBlue-600 dark:text-lavenderHaze-600",
                !isOpen && "lg:hidden",
              )}
            >
              No saved conversations yet.
            </p>
          )}
          {conversationItems.slice(0, 6).map((item) => {
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
                    "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                    isActive &&
                      "bg-lavenderHaze-100 dark:bg-nightIndigo-500/25",
                    !isOpen && "lg:flex-1 lg:justify-center lg:px-2",
                  )}
                >
                  <i
                    className={classNames(item.personaIcon, "shrink-0 text-sm")}
                  ></i>
                  <div
                    className={classNames("min-w-0", !isOpen && "lg:hidden")}
                  >
                    <p className="truncate text-xs font-medium">{item.title}</p>
                    <p className="truncate text-xxs text-midnightBlue-600 dark:text-lavenderHaze-600">
                      {item.personaLabel} - {item.updatedAtLabel}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  className={classNames(
                    "SidebarDeleteBtn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-xs text-midnightBlue-700 transition-all dark:text-lavenderHaze-700",
                    "hover:border-slate-400 hover:bg-lavenderHaze-300/70 hover:opacity-100",
                    "focus-visible:border-lavenderHaze-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
                    "dark:hover:border-slate-500 dark:hover:bg-nightIndigo-500/30",
                    "dark:focus-visible:border-nightIndigo-400 dark:focus-visible:ring-nightIndigo-500/40",
                    isDeleteDisabled &&
                      "cursor-not-allowed opacity-35 hover:border-transparent hover:bg-transparent",
                  )}
                  onClick={() => requestDeleteConversation(item)}
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
      <ConfirmationModal
        isOpen={Boolean(pendingDeleteItem)}
        title="Delete conversation"
        description={
          pendingDeleteItem
            ? `Delete "${pendingDeleteItem.title}"? This cannot be undone.`
            : "Delete this conversation?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          const item = pendingDeleteItem;
          setPendingDeleteItem(null);

          if (item) {
            void handleDeleteConversation(item);
          }
        }}
        onCancel={() => setPendingDeleteItem(null)}
      />
    </nav>
  );
}
