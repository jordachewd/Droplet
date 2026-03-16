"use client";

import { useMemo, useState, useEffect } from "react";
import classNames from "classnames";

export interface AlertParams {
  id?: number;
  title: string;
  text?: string;
  severity?: "info" | "error" | "success" | "warning";
  variant?: "filled" | "outlined";
}

interface AlertMessageProps {
  message: AlertParams;
}

const filledSeverityStyles = {
  info: "bg-sky-600 text-white border-sky-600",
  error: "bg-red-700 text-white border-red-700",
  success: "bg-emerald-700 text-white border-emerald-700",
  warning: "bg-amber-600 text-white border-amber-600",
};

const outlinedSeverityStyles = {
  info: "bg-white text-sky-700 border-sky-600 dark:bg-jwdMarine-1000 dark:text-sky-300",
  error:
    "bg-white text-red-700 border-red-600 dark:bg-jwdMarine-1000 dark:text-red-300",
  success:
    "bg-white text-emerald-700 border-emerald-600 dark:bg-jwdMarine-1000 dark:text-emerald-300",
  warning:
    "bg-white text-amber-700 border-amber-600 dark:bg-jwdMarine-1000 dark:text-amber-300",
};

export default function AlertMessage({ message }: AlertMessageProps) {
  const {
    id = 0,
    title,
    text = "",
    severity = "error",
    variant = "filled",
  } = message;
  const [dismissedAlert, setDismissedAlert] = useState<string | null>(null);
  const currentAlertKey = useMemo(
    () => `${id}:${title}:${text}:${severity}:${variant}`,
    [id, severity, text, title, variant],
  );
  const openAlert = text !== "" && dismissedAlert !== currentAlertKey;

  useEffect(() => {
    if (!openAlert) return;

    const timeoutId = window.setTimeout(() => {
      setDismissedAlert(currentAlertKey);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [currentAlertKey, openAlert]);

  if (!openAlert) return null;

  const variantClass =
    variant === "outlined"
      ? outlinedSeverityStyles[severity]
      : filledSeverityStyles[severity];

  return (
    <div className="AlertMessage fixed left-1/2 top-4 z-100 w-full max-w-xl -translate-x-1/2 px-4">
      <div
        role="alert"
        className={classNames(
          "animate-fade-down rounded-lg border p-4 shadow-lg",
          variantClass,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 className="heading-6 text-base! leading-tight! text-inherit!">
                {title}
              </h2>
            )}
            <p className="text-sm">{text}</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-sm transition-opacity hover:opacity-80"
            onClick={() => setDismissedAlert(currentAlertKey)}
            aria-label="Close alert"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
