"use client";

import classNames from "classnames";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/lib/actions/task.actions";

interface LibraryDeleteButtonProps {
  conversationId: string;
  conversationTitle: string;
  isDemo?: boolean;
}

export default function LibraryDeleteButton({
  conversationId,
  conversationTitle,
  isDemo = false,
}: LibraryDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  async function handleDelete() {
    if (isDemo || isDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${conversationTitle}"? This cannot be undone.`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = (await deleteTask(conversationId)) as
        | {
            status?: number;
            message?: string;
          }
        | undefined;

      if (result?.status !== 200) {
        window.alert(result?.message || "Conversation deletion failed.");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Conversation deletion failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      className={classNames(
        "LibraryDeleteBtn inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-all",
        "border-lightBorders-400 bg-white/75 text-lightText-900 hover:-translate-y-0.5 hover:bg-lightSecondary-300/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lightPrimary-300/60",
        "dark:border-darkBorders-500 dark:bg-jwdMarine-900/75 dark:text-white dark:hover:bg-darkSecondary-500/30",
        "dark:focus-visible:ring-darkPrimary-500/40",
        (isDeleting || isDemo) &&
          "cursor-not-allowed opacity-45 hover:translate-y-0 hover:bg-white/75 dark:hover:bg-jwdMarine-900/75",
      )}
      onClick={() => void handleDelete()}
      disabled={isDeleting || isDemo}
      aria-label={
        isDemo
          ? `Delete unavailable for demo conversation ${conversationTitle}`
          : `Delete ${conversationTitle}`
      }
      title={
        isDemo ? "Demo conversations cannot be deleted" : "Delete conversation"
      }
    >
      <i
        className={classNames(
          isDeleting ? "bi bi-arrow-repeat animate-spin" : "bi bi-trash3",
          "text-base",
        )}
      ></i>
    </button>
  );
}
