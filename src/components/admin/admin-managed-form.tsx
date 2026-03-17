"use client";

import { ReactNode, useActionState, useEffect, useMemo, useState } from "react";
import AlertMessage, { AlertParams } from "@/components/shared/alert-message";
import {
  ADMIN_ACTION_INITIAL_STATE,
  AdminActionState,
} from "@/components/admin/admin-action-state";

interface AdminManagedFormProps {
  action: (
    previousState: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
  className?: string;
  confirmMessage?: string;
  children: ReactNode;
  successTitle?: string;
  errorTitle?: string;
  autoDismissSuccessMs?: number;
}

export function AdminManagedForm({
  action,
  className,
  confirmMessage,
  children,
  successTitle = "Success",
  errorTitle = "Action failed",
  autoDismissSuccessMs = 5000,
}: AdminManagedFormProps) {
  const [state, formAction] = useActionState(
    action,
    ADMIN_ACTION_INITIAL_STATE,
  );
  const [alert, setAlert] = useState<AlertParams | null>(null);

  const wrappedAction = (formData: FormData) => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    formAction(formData);
  };

  const alertPayload = useMemo(() => {
    if (state.status === "idle" || state.message.trim().length === 0) {
      return null;
    }

    const severity =
      state.severity ?? (state.status === "success" ? "success" : "error");

    return {
      title: state.status === "success" ? successTitle : errorTitle,
      text: state.message,
      severity,
      variant: "outlined",
    } satisfies AlertParams;
  }, [errorTitle, state.message, state.severity, state.status, successTitle]);

  useEffect(() => {
    if (!alertPayload) {
      return;
    }

    setAlert(alertPayload);
  }, [alertPayload]);

  useEffect(() => {
    if (!alert || alert.severity !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAlert(null);
    }, autoDismissSuccessMs);

    return () => window.clearTimeout(timeoutId);
  }, [alert, autoDismissSuccessMs]);

  return (
    <form action={wrappedAction} className={className}>
      {alert ? <AlertMessage message={alert} /> : null}
      {children}
    </form>
  );
}
