"use client";

import { ReactNode, useActionState, useEffect, useMemo, useState } from "react";
import AlertMessage, { AlertParams } from "@/components/shared/alert-message";
import ConfirmationModal from "@/components/shared/confirmation-modal";
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
  const [dismissedSuccessKey, setDismissedSuccessKey] = useState<string | null>(
    null,
  );
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const wrappedAction = (formData: FormData) => {
    if (confirmMessage) {
      setPendingFormData(formData);
      setIsConfirmOpen(true);
      return;
    }

    formAction(formData);
  };

  const handleConfirm = () => {
    if (pendingFormData) {
      formAction(pendingFormData);
    }

    setPendingFormData(null);
    setIsConfirmOpen(false);
  };

  const handleCancel = () => {
    setPendingFormData(null);
    setIsConfirmOpen(false);
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

  const alertKey = useMemo(() => {
    if (!alertPayload) {
      return null;
    }

    return `${state.status}:${alertPayload.severity}:${state.message}`;
  }, [alertPayload, state.message, state.status]);

  const alert = useMemo(() => {
    if (!alertPayload) {
      return null;
    }

    if (
      alertPayload.severity === "success" &&
      alertKey &&
      dismissedSuccessKey === alertKey
    ) {
      return null;
    }

    return alertPayload;
  }, [alertKey, alertPayload, dismissedSuccessKey]);

  useEffect(() => {
    if (!alertPayload || alertPayload.severity !== "success" || !alertKey) {
      return;
    }

    if (dismissedSuccessKey === alertKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedSuccessKey(alertKey);
    }, autoDismissSuccessMs);

    return () => window.clearTimeout(timeoutId);
  }, [alertKey, alertPayload, autoDismissSuccessMs, dismissedSuccessKey]);

  return (
    <>
      <form action={wrappedAction} className={className}>
        {alert ? <AlertMessage message={alert} /> : null}
        {children}
      </form>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Confirm action"
        description={confirmMessage ?? "Are you sure?"}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
