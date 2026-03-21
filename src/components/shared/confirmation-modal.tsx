"use client";

import classNames from "classnames";
import { useEffect, useId, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const dialogElement = dialogRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = (): HTMLElement[] =>
      dialogElement
        ? Array.from(
            dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
          )
        : [];

    const [firstFocusableElement] = getFocusableElements();
    firstFocusableElement?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ConfirmationModal fixed inset-0 z-50 flex items-center justify-center bg-midnightBlue-1000/55 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-300 bg-lavenderHaze-100 p-5 shadow-lg dark:border-slate-500 dark:bg-nightIndigo-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        ref={dialogRef}
      >
        <h3 id={titleId} className="heading-6">
          {title}
        </h3>
        <p
          id={descriptionId}
          className="mt-2 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600"
        >
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outlined"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={classNames(
              "btn btn-sm",
              destructive
                ? "bg-red-700 text-white hover:bg-red-800"
                : "btn-contained",
            )}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
