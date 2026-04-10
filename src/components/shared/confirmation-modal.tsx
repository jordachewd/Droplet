"use client";

import { useEffect, useId, useRef } from "react";
import Button from "@/components/shared/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) {
      return;
    }

    if (isOpen) {
      previouslyFocusedElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!dialogElement.open) {
        if (typeof dialogElement.showModal === "function") {
          dialogElement.showModal();
        } else {
          dialogElement.setAttribute("open", "true");
        }
      }
      return;
    }

    if (dialogElement.open) {
      if (typeof dialogElement.close === "function") {
        dialogElement.close();
      } else {
        dialogElement.removeAttribute("open");
      }
    }
    previouslyFocusedElementRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const dialogElement = dialogRef.current;

    return () => {
      if (dialogElement?.open) {
        if (typeof dialogElement.close === "function") {
          dialogElement.close();
        } else {
          dialogElement.removeAttribute("open");
        }
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="ConfirmationModal fixed inset-0 z-50 m-auto w-[min(100%-2rem,28rem)] rounded-xl border border-slate-300 bg-lavenderHaze-100 p-5 shadow-lg backdrop:bg-midnightBlue-1000/55 dark:border-slate-500 dark:bg-nightIndigo-900"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full">
        <h3 id={titleId} className="heading-6">
          {title}
        </h3>
        <p id={descriptionId} className="mt-2 admin-muted-text">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outlined" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            className={
              destructive
                ? "border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800"
                : undefined
            }
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
