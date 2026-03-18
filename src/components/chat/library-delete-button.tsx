"use client";

import classNames from "classnames";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AlertMessage from "@/components/shared/alert-message";
import ConfirmationModal from "@/components/shared/confirmation-modal";
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
  const [alert, setAlert] = useState<{
    id: number;
    title: string;
    text: string;
    severity: "success" | "error";
    variant: "outlined";
  } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  async function handleDeleteConfirmed() {
    if (isDemo || isDeleting) {
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
        setAlert({
          id: Date.now(),
          title: "Delete failed",
          text: result?.message || "Conversation deletion failed.",
          severity: "error",
          variant: "outlined",
        });
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
      setIsDeleting(false);
    }
  }

  function handleDeleteRequested() {
    if (isDemo || isDeleting) {
      return;
    }

    setIsConfirmOpen(true);
  }

  return (
    <>
      {alert ? <AlertMessage message={alert} /> : null}
      <button
        type="button"
        className={classNames(
          "LibraryDeleteBtn inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-all",
          "border-slate-400 bg-lavenderHaze-100/75 text-midnightBlue-900 hover:-translate-y-0.5 hover:bg-lavenderHaze-300/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
          "dark:border-slate-500 dark:bg-nightIndigo-900/75 dark:text-white dark:hover:bg-nightIndigo-500/30",
          "dark:focus-visible:ring-nightIndigo-500/40",
          (isDeleting || isDemo) &&
            "cursor-not-allowed opacity-45 hover:translate-y-0 hover:bg-lavenderHaze-100/75 dark:hover:bg-nightIndigo-900/75",
        )}
        onClick={handleDeleteRequested}
        disabled={isDeleting || isDemo}
        aria-label={
          isDemo
            ? `Delete unavailable for demo conversation ${conversationTitle}`
            : `Delete ${conversationTitle}`
        }
        title={
          isDemo
            ? "Demo conversations cannot be deleted"
            : "Delete conversation"
        }
      >
        <i
          className={classNames(
            isDeleting ? "bi bi-arrow-repeat animate-spin" : "bi bi-trash3",
            "text-base",
          )}
        ></i>
      </button>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete conversation"
        description={`Delete "${conversationTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setIsConfirmOpen(false);
          void handleDeleteConfirmed();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
