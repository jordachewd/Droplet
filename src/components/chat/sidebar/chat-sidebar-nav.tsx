"use client";

import Link from "next/link";
import classNames from "classnames";
import {
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import AlertMessage from "@/components/shared/alert-message";
import ConfirmationModal from "@/components/shared/confirmation-modal";
import { ConversationListItem } from "@/types/PersonaData.d";
import { deleteTask, renameTask } from "@/lib/actions/task.actions";

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
    label: "Home",
    icon: "bi bi-house",
    exact: true,
  },
  { href: "/app/new", label: "New Chat", icon: "bi bi-plus-circle" },
  { href: "/app/library", label: "Library", icon: "bi bi-collection" },
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
      aria-label={item.label}
      className={classNames(
        "group sidebar-nav-link duration-300",
        "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
        isActive &&
          "bg-lavenderHaze-100 font-semibold dark:bg-nightIndigo-500/25",
        !isOpen && "lg:w-auto lg:justify-center lg:px-2",
      )}
    >
      <i className={classNames(item.icon, "text-base")} aria-hidden="true"></i>
      <span
        className={classNames(
          "overflow-hidden whitespace-nowrap transition-all duration-300",
          isOpen
            ? "max-w-40 translate-x-0 opacity-100"
            : "lg:max-w-0 lg:-translate-x-1 lg:opacity-0",
        )}
      >
        {item.label}
      </span>
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
  const [openMenuConversationId, setOpenMenuConversationId] = useState<
    string | null
  >(null);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [renamingConversationId, setRenamingConversationId] = useState<
    string | null
  >(null);
  const [alert, setAlert] = useState<{
    id: number | string;
    title: string;
    text: string;
    severity: "success" | "error";
    variant: "outlined";
  } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const skipRenameBlurRef = useRef<boolean>(false);
  const renameSubmissionInFlightRef = useRef<boolean>(false);
  const headingClass = classNames(
    "overflow-hidden px-2.5 text-xxs font-semibold uppercase tracking-wide text-midnightBlue-700 transition-all duration-300 dark:text-lavenderHaze-700",
    isOpen
      ? "max-h-6 translate-y-0 opacity-100"
      : "lg:max-h-0 lg:-translate-y-1 lg:opacity-0",
  );

  useEffect(() => {
    setConversationItems(historyItems);
  }, [historyItems]);

  useEffect(() => {
    if (!openMenuConversationId) {
      return;
    }

    const onOutsidePointerDown = (event: PointerEvent) => {
      if (!menuContainerRef.current) {
        return;
      }

      if (!menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuConversationId(null);
      }
    };

    const onEscapePress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuConversationId(null);
      }
    };

    window.addEventListener("pointerdown", onOutsidePointerDown);
    window.addEventListener("keydown", onEscapePress);

    return () => {
      window.removeEventListener("pointerdown", onOutsidePointerDown);
      window.removeEventListener("keydown", onEscapePress);
    };
  }, [openMenuConversationId]);

  useEffect(() => {
    if (!openMenuConversationId) {
      return;
    }

    const firstMenuItem =
      menuContainerRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    firstMenuItem?.focus();
  }, [openMenuConversationId]);

  useEffect(() => {
    if (!editingConversationId) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingConversationId]);

  function setAlertMessage(message: {
    title: string;
    text: string;
    severity: "success" | "error";
  }) {
    setAlert({
      id: crypto.randomUUID(),
      title: message.title,
      text: message.text,
      severity: message.severity,
      variant: "outlined",
    });
  }

  function closeInlineRename() {
    setEditingConversationId(null);
    setEditingTitle("");
    skipRenameBlurRef.current = false;
  }

  async function handleDeleteConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId || renamingConversationId) {
      return;
    }

    setOpenMenuConversationId(null);
    closeInlineRename();
    setDeletingConversationId(item.id);

    try {
      const result = (await deleteTask(item.id)) as
        | {
            status?: number;
            message?: string;
          }
        | undefined;

      if (result?.status !== 200) {
        setAlertMessage({
          title: "Delete failed",
          text: result?.message || "Conversation deletion failed.",
          severity: "error",
        });
        return;
      }

      setConversationItems((currentItems) =>
        currentItems.filter((entry) => entry.id !== item.id),
      );

      if (pathname === item.href) {
        setAlertMessage({
          title: "Conversation removed",
          text: "Conversation deleted successfully.",
          severity: "success",
        });
        router.replace("/app");
        return;
      }

      setAlertMessage({
        title: "Conversation removed",
        text: "Conversation deleted successfully.",
        severity: "success",
      });
      router.refresh();
    } catch (error) {
      void error;
      // Deletion failures are surfaced via the user-facing alert below.
      setAlertMessage({
        title: "Delete failed",
        text: "Conversation deletion failed.",
        severity: "error",
      });
    } finally {
      setDeletingConversationId(null);
    }
  }

  function requestDeleteConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId || renamingConversationId) {
      return;
    }

    setPendingDeleteItem(item);
  }

  function handleConversationMenuKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpenMenuConversationId(null);
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const menuItems = Array.from(
      menuContainerRef.current?.querySelectorAll<HTMLElement>(
        "[role='menuitem']",
      ) ?? [],
    );

    if (menuItems.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = menuItems.findIndex((item) => item === activeElement);
    const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;

    event.preventDefault();

    if (event.key === "Home") {
      menuItems[0]?.focus();
      return;
    }

    if (event.key === "End") {
      menuItems[menuItems.length - 1]?.focus();
      return;
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? (fallbackIndex + 1) % menuItems.length
        : (fallbackIndex - 1 + menuItems.length) % menuItems.length;

    menuItems[nextIndex]?.focus();
  }

  function startRenameConversation(item: ConversationListItem) {
    if (item.isDemo || deletingConversationId || renamingConversationId) {
      return;
    }

    setOpenMenuConversationId(null);
    setEditingConversationId(item.id);
    setEditingTitle(item.title);
  }

  async function handleRenameConversation(item: ConversationListItem) {
    if (renameSubmissionInFlightRef.current || item.isDemo) {
      return;
    }

    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      setAlertMessage({
        title: "Rename failed",
        text: "Conversation title cannot be empty.",
        severity: "error",
      });
      return;
    }

    if (trimmedTitle === item.title) {
      closeInlineRename();
      return;
    }

    renameSubmissionInFlightRef.current = true;
    setRenamingConversationId(item.id);

    try {
      const result = (await renameTask(item.id, trimmedTitle)) as
        | {
            status?: number;
            message?: string;
          }
        | undefined;

      if (result?.status !== 200) {
        setAlertMessage({
          title: "Rename failed",
          text: result?.message ?? "Conversation rename failed.",
          severity: "error",
        });
        return;
      }

      setConversationItems((currentItems) =>
        currentItems.map((entry) =>
          entry.id === item.id ? { ...entry, title: trimmedTitle } : entry,
        ),
      );

      closeInlineRename();
      setAlertMessage({
        title: "Conversation renamed",
        text: "Conversation title updated successfully.",
        severity: "success",
      });
      router.refresh();
    } catch (error) {
      void error;
      // Rename failures are surfaced via the user-facing alert below.
      setAlertMessage({
        title: "Rename failed",
        text: "Conversation rename failed.",
        severity: "error",
      });
    } finally {
      renameSubmissionInFlightRef.current = false;
      setRenamingConversationId(null);
    }
  }

  function handleRenameInputBlur(item: ConversationListItem) {
    if (skipRenameBlurRef.current) {
      skipRenameBlurRef.current = false;
      return;
    }

    void handleRenameConversation(item);
  }

  function handleRenameInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    item: ConversationListItem,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleRenameConversation(item);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      skipRenameBlurRef.current = true;
      closeInlineRename();
    }
  }

  return (
    <nav className="ChatSidebarNav mb-auto flex flex-col gap-6 p-4">
      {alert ? <AlertMessage message={alert} /> : null}

      <section className="ChatSidebarNavSection flex flex-col gap-1 transition-all duration-300">
        {WORKSPACE_LINKS.map((link) => (
          <SidebarNavLink
            key={link.href}
            item={link}
            pathname={pathname}
            isOpen={isOpen}
          />
        ))}
      </section>

      {isOpen ? (
        <section className="ChatSidebarNavSection flex flex-col gap-1 transition-all duration-300">
          <p className={headingClass}>Recent</p>

          <div className="flex flex-col gap-1">
            {conversationItems.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
                No saved conversations yet.
              </p>
            )}

            {conversationItems.slice(0, 6).map((item) => {
              const isActive = pathname === item.href;
              const isDeleting = deletingConversationId === item.id;
              const isEditing = editingConversationId === item.id;
              const isRenaming = renamingConversationId === item.id;
              const isMenuOpen = openMenuConversationId === item.id;
              const hasActionInProgress = Boolean(
                deletingConversationId || renamingConversationId,
              );
              const isDeleteDisabled = hasActionInProgress || item.isDemo;
              const isRenameDisabled = hasActionInProgress || item.isDemo;

              return (
                <div
                  key={item.id}
                  className="group flex w-full items-center gap-1"
                >
                  {isEditing ? (
                    <div
                      className={classNames(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                        isActive &&
                          "bg-lavenderHaze-100 dark:bg-nightIndigo-500/25",
                      )}
                    >
                      <i
                        className={classNames(
                          item.personaIcon,
                          "shrink-0 text-sm",
                          isRenaming && "opacity-50",
                        )}
                        aria-hidden="true"
                      ></i>

                      <div className="min-w-0 flex-1">
                        <input
                          ref={
                            isEditing
                              ? (element) => {
                                  renameInputRef.current = element;
                                }
                              : null
                          }
                          type="text"
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          onBlur={() => handleRenameInputBlur(item)}
                          onKeyDown={(event) =>
                            handleRenameInputKeyDown(event, item)
                          }
                          disabled={isRenaming}
                          className={classNames(
                            "w-full rounded-md border bg-lavenderHaze-50 px-2 py-1 text-xs font-medium text-midnightBlue-900",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/70",
                            "dark:border-nightIndigo-300 dark:bg-nightIndigo-700/60 dark:text-lavenderHaze-100",
                          )}
                          aria-label="Rename conversation title"
                        />
                        <p className="truncate pt-1 text-xxs text-midnightBlue-600 dark:text-lavenderHaze-600">
                          {item.personaLabel} - {item.updatedAtLabel}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      aria-label={`${item.title} conversation`}
                      className={classNames(
                        "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-300",
                        "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                        isActive &&
                          "bg-lavenderHaze-100 dark:bg-nightIndigo-500/25",
                      )}
                    >
                      <i
                        className={classNames(
                          item.personaIcon,
                          "shrink-0 text-sm transition-all duration-300",
                        )}
                        aria-hidden="true"
                      ></i>
                      <div className="min-w-0 transition-all duration-300">
                        <p className="truncate text-xs font-medium">
                          {item.title}
                        </p>
                        <p className="truncate text-xxs text-midnightBlue-600 dark:text-lavenderHaze-600">
                          {item.personaLabel} - {item.updatedAtLabel}
                        </p>
                      </div>
                    </Link>
                  )}

                  {!isEditing ? (
                    <div
                      ref={
                        isMenuOpen
                          ? (element) => {
                              menuContainerRef.current = element;
                            }
                          : null
                      }
                      className="relative shrink-0"
                    >
                      <button
                        type="button"
                        className={classNames(
                          "SidebarConversationMenuTrigger inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-xs text-midnightBlue-700 transition-all dark:text-lavenderHaze-700",
                          "hover:border-slate-400 hover:bg-lavenderHaze-300/70 hover:opacity-100",
                          "focus-visible:border-lavenderHaze-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
                          "dark:hover:border-slate-500 dark:hover:bg-nightIndigo-500/30",
                          "dark:focus-visible:border-nightIndigo-400 dark:focus-visible:ring-nightIndigo-500/40",
                          hasActionInProgress &&
                            "cursor-not-allowed opacity-35 hover:border-transparent hover:bg-transparent",
                        )}
                        onClick={() =>
                          setOpenMenuConversationId((currentId) =>
                            currentId === item.id ? null : item.id,
                          )
                        }
                        disabled={hasActionInProgress}
                        aria-label={`Conversation actions for ${item.title}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-controls={
                          isMenuOpen
                            ? `conversation-menu-${item.id}`
                            : undefined
                        }
                      >
                        <i
                          className="bi bi-three-dots text-sm"
                          aria-hidden="true"
                        ></i>
                      </button>

                      {isMenuOpen ? (
                        <div
                          id={`conversation-menu-${item.id}`}
                          role="menu"
                          aria-label={`Conversation actions for ${item.title}`}
                          className={classNames(
                            "SidebarConversationMenu absolute right-0 top-full z-40 mt-1 min-w-40 rounded-lg border border-lavenderHaze-300 bg-lavenderHaze-100 p-1 shadow-lg",
                            "dark:border-nightIndigo-400 dark:bg-nightIndigo-900",
                          )}
                          onKeyDown={handleConversationMenuKeyDown}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            tabIndex={0}
                            className={classNames(
                              "SidebarConversationMenuItem flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                              "hover:bg-lavenderHaze-300/70 dark:hover:bg-nightIndigo-500/30",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60 dark:focus-visible:ring-nightIndigo-500/40",
                              isRenameDisabled &&
                                "cursor-not-allowed opacity-40",
                            )}
                            onClick={() => startRenameConversation(item)}
                            disabled={isRenameDisabled}
                          >
                            <i
                              className="bi bi-pencil-square"
                              aria-hidden="true"
                            ></i>
                            Rename
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            tabIndex={0}
                            className={classNames(
                              "SidebarConversationMenuItem flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-rose-700 transition-colors dark:text-rose-300",
                              "hover:bg-rose-100/70 dark:hover:bg-rose-500/20",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60 dark:focus-visible:ring-rose-500/40",
                              isDeleteDisabled &&
                                "cursor-not-allowed opacity-40",
                            )}
                            onClick={() => {
                              setOpenMenuConversationId(null);
                              requestDeleteConversation(item);
                            }}
                            disabled={isDeleteDisabled}
                          >
                            <i
                              className={classNames(
                                isDeleting
                                  ? "bi bi-arrow-repeat animate-spin"
                                  : "bi bi-trash3",
                              )}
                              aria-hidden="true"
                            ></i>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

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
