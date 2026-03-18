"use client";

import classNames from "classnames";
import { useEffect } from "react";

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
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirmation-modal-title" className="heading-6">
          {title}
        </h3>
        <p
          id="confirmation-modal-description"
          className="mt-2 text-sm opacity-85"
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
