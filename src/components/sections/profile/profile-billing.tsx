"use client";

import AlertMessage, { AlertParams } from "@/components/shared/alert-message";
import Button from "@/components/shared/button";
import ConfirmationModal from "@/components/shared/confirmation-modal";
import {
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
  type SubscriptionActionResponse,
} from "@/lib/actions/transaction.action";
import getFormattedDate from "@/lib/utils/getFormattedDate";
import classNames from "classnames";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type SubscriptionStatus, type PlanName } from "@/types/PlanData.d";
import { Transaction } from "@/types/TransactionData.d";

interface BillingProps {
  stripeId: string | null;
  stripeSubscriptionId: string | null;
  planName: PlanName;
  subscriptionStatus: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  nextBillingDate: Date | string | null;
  isAdmin: boolean;
  userTxns: Transaction[] | null;
  currencySymbol?: string;
}

type SubscriptionViewState =
  | "none"
  | "active"
  | "canceling"
  | "past_due"
  | "canceled";

function resolveSubscriptionViewState({
  planName,
  stripeSubscriptionId,
  subscriptionStatus,
  cancelAtPeriodEnd,
}: {
  planName: PlanName;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
}): SubscriptionViewState {
  if (planName === "Lite" || !stripeSubscriptionId) {
    return "none";
  }

  if (subscriptionStatus === "canceled") {
    return "canceled";
  }

  if (cancelAtPeriodEnd) {
    return "canceling";
  }

  if (subscriptionStatus === "past_due") {
    return "past_due";
  }

  return "active";
}

function resolveSubscriptionBadgeClass(
  subscriptionViewState: SubscriptionViewState,
): string {
  if (subscriptionViewState === "active") {
    return "bg-emerald-700 text-white";
  }

  if (subscriptionViewState === "canceling") {
    return "bg-amber-600 text-white";
  }

  if (subscriptionViewState === "past_due") {
    return "bg-red-700 text-white";
  }

  if (subscriptionViewState === "canceled") {
    return "bg-slate-600 text-white";
  }

  return "bg-sky-700 text-white";
}

function resolveSubscriptionLabel(
  subscriptionViewState: SubscriptionViewState,
): string {
  if (subscriptionViewState === "active") {
    return "Active";
  }

  if (subscriptionViewState === "canceling") {
    return "Canceling";
  }

  if (subscriptionViewState === "past_due") {
    return "Past due";
  }

  if (subscriptionViewState === "canceled") {
    return "Canceled";
  }

  return "Lite";
}

export default function ProfileBilling({
  stripeId,
  stripeSubscriptionId,
  planName,
  subscriptionStatus,
  cancelAtPeriodEnd,
  nextBillingDate,
  isAdmin,
  userTxns,
  currencySymbol = "$",
}: BillingProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] =
    useState<boolean>(false);
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] =
    useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<AlertParams | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const nextAlertId = useRef<number>(0);

  function createAlertId(): number {
    nextAlertId.current += 1;
    return nextAlertId.current;
  }

  const billingTableHeaderClass = classNames(
    "mb-3 flex items-center justify-between gap-4 rounded-md px-3 py-1.5",
    "bg-slate-300/30 text-xs font-medium uppercase tracking-wider text-slate-600",
    "dark:bg-slate-300/10 dark:text-slate-300",
  );

  const billingRowClass = classNames(
    "mt-1 flex items-center justify-between gap-4 rounded-md px-3 py-1 text-sm",
    "text-slate-500 transition-colors duration-200 ease-in-out hover:bg-slate-300/20",
    "dark:text-slate-400 dark:hover:bg-slate-300/5",
  );

  const subscriptionViewState = resolveSubscriptionViewState({
    planName,
    stripeSubscriptionId,
    subscriptionStatus,
    cancelAtPeriodEnd,
  });
  const canManageSubscription =
    !isAdmin &&
    planName !== "Lite" &&
    Boolean(stripeSubscriptionId) &&
    subscriptionViewState !== "canceled";
  const canCancelAtPeriodEnd =
    canManageSubscription &&
    (subscriptionViewState === "active" ||
      subscriptionViewState === "past_due");
  const canReactivate =
    canManageSubscription && subscriptionViewState === "canceling";
  const nextBillingDateLabel =
    nextBillingDate &&
    !Number.isNaN(new Date(nextBillingDate).getTime()) &&
    (subscriptionViewState === "active" ||
      subscriptionViewState === "canceling" ||
      subscriptionViewState === "past_due")
      ? getFormattedDate(nextBillingDate)
      : null;
  const nextBillingText =
    subscriptionViewState === "canceling"
      ? "Access ends on"
      : "Next billing date";

  async function runSubscriptionAction(
    actionType: "cancel" | "reactivate",
  ): Promise<void> {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const actionResult: SubscriptionActionResponse =
        actionType === "cancel"
          ? await cancelSubscriptionAction()
          : await reactivateSubscriptionAction();
      setAlertMessage({
        id: createAlertId(),
        title:
          actionResult.status === 200
            ? "Billing updated"
            : "Billing update failed",
        text: actionResult.message,
        severity: actionResult.severity,
        variant: "outlined",
      });
      router.refresh();
    } catch (error) {
      void error;
      setAlertMessage({
        id: createAlertId(),
        title: "Billing update failed",
        text: "Unable to update subscription right now. Please try again.",
        severity: "error",
        variant: "outlined",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConfirmCancel(): void {
    setIsCancelConfirmOpen(false);
    void runSubscriptionAction("cancel");
  }

  function handleConfirmReactivate(): void {
    setIsReactivateConfirmOpen(false);
    void runSubscriptionAction("reactivate");
  }

  async function handleInvoiceDownload(invoiceId: string): Promise<void> {
    if (loadingInvoiceId) {
      return;
    }

    setLoadingInvoiceId(invoiceId);

    try {
      const response = await fetch(
        `/api/checkout/invoice-url?invoice_id=${encodeURIComponent(invoiceId)}`,
      );

      if (!response.ok) {
        setAlertMessage({
          id: createAlertId(),
          title: "Invoice unavailable",
          text: "Unable to retrieve the invoice. Please try again.",
          severity: "warning",
          variant: "outlined",
        });
        return;
      }

      const data: unknown = await response.json();

      if (
        typeof data === "object" &&
        data !== null &&
        "url" in data &&
        typeof (data as { url: unknown }).url === "string"
      ) {
        window.open((data as { url: string }).url, "_blank", "noopener");
      }
    } catch (error) {
      void error;
      setAlertMessage({
        id: createAlertId(),
        title: "Invoice unavailable",
        text: "Unable to retrieve the invoice. Please try again.",
        severity: "warning",
        variant: "outlined",
      });
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  return (
    <section className="ProfileBilling mx-auto flex w-full max-w-7xl flex-col gap-6 px-4">
      {alertMessage ? <AlertMessage message={alertMessage} /> : null}

      <div
        className={classNames(
          "rounded-lg border p-4",
          "border-slate-300 bg-lavenderHaze-100/70 dark:border-slate-500 dark:bg-nightIndigo-1000/70",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="heading-5 text-center">Subscription</h2>
            <span
              className={classNames(
                "inline-flex items-center rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                resolveSubscriptionBadgeClass(subscriptionViewState),
              )}
            >
              {resolveSubscriptionLabel(subscriptionViewState)}
            </span>
          </div>
          {nextBillingDateLabel ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {nextBillingText}:{" "}
              <span className="font-medium">{nextBillingDateLabel}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {subscriptionViewState === "none"
            ? "You are currently on the Lite plan with no recurring billing."
            : subscriptionViewState === "canceling"
              ? "Cancellation is scheduled. Your access remains active until the current period ends."
              : subscriptionViewState === "past_due"
                ? "Your subscription is past due. Resolve payment issues to avoid service interruption."
                : subscriptionViewState === "canceled"
                  ? "This subscription is canceled."
                  : "Your subscription renews automatically each billing cycle."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {canCancelAtPeriodEnd ? (
            <Button
              type="button"
              size="sm"
              loading={isSubmitting}
              onClick={() => setIsCancelConfirmOpen(true)}
            >
              Cancel at period end
            </Button>
          ) : null}
          {canReactivate ? (
            <Button
              type="button"
              variant="outlined"
              size="sm"
              loading={isSubmitting}
              onClick={() => setIsReactivateConfirmOpen(true)}
            >
              Keep subscription active
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <h2 className="heading-4 text-center">Billing History</h2>
      </div>

      {userTxns && userTxns.length > 0 ? (
        <div className="flex w-full flex-col">
          <div className={billingTableHeaderClass}>
            <p className="flex-1">Plan</p>
            <p className="flex-1 text-center">Amount</p>
            <p className="hidden flex-1 text-center md:flex">Purchased</p>
            <p className="hidden flex-1 text-center md:flex">Expires</p>
            <p className="min-w-14 text-center">Status</p>
            <p className="hidden min-w-16 text-center lg:flex">Invoice</p>
          </div>

          {userTxns.map((txn, index) => {
            const payCycle = txn.billing === "Monthly" ? "Mo" : "Yr";
            const txnStatus = txn.stripeId === stripeId ? "Active" : "Inactive";
            const txnColor = classNames(
              "inline-flex items-center justify-center rounded p-1 text-xxs leading-none",
              txn.stripeId === stripeId
                ? "bg-green-700 text-white"
                : "bg-slate-300 text-slate-400 dark:bg-slate-300/10 dark:text-slate-400",
            );
            const createdAtMs = new Date(txn.createdAt).getTime();
            const txnKey = `${txn.id}-${txn.stripeId}-${createdAtMs}-${index}`;

            return (
              <div key={txnKey} className={billingRowClass}>
                <p className="flex-1 font-medium">{txn.plan}</p>
                <p className="flex-1 text-center font-medium">
                  {currencySymbol}
                  {txn.amount}
                  <span className="text-xxs font-normal"> / {payCycle}</span>
                </p>
                <p className="hidden flex-1 text-center text-xxs md:flex">
                  {getFormattedDate(txn.createdAt)}
                </p>
                <p className="hidden flex-1 text-center text-xxs md:flex">
                  {getFormattedDate(txn.expiresOn)}
                </p>
                <p className="min-w-14 text-center text-xxs">
                  <span className={txnColor}>{txnStatus}</span>
                </p>
                <p className="hidden min-w-16 text-center lg:flex">
                  {txn.stripeInvoiceId ? (
                    <button
                      type="button"
                      className="text-xxs text-sky-600 underline hover:text-sky-500 disabled:opacity-50 dark:text-sky-400 dark:hover:text-sky-300"
                      disabled={loadingInvoiceId === txn.stripeInvoiceId}
                      onClick={() =>
                        void handleInvoiceDownload(txn.stripeInvoiceId!)
                      }
                    >
                      {loadingInvoiceId === txn.stripeInvoiceId
                        ? "Loading..."
                        : "View"}
                    </button>
                  ) : (
                    <span className="text-xxs text-slate-400">—</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No transactions yet.
        </p>
      )}

      <ConfirmationModal
        isOpen={isCancelConfirmOpen}
        title="Cancel subscription"
        description="Cancel your subscription at the end of the current billing period? You keep access until the period ends."
        confirmLabel="Confirm cancellation"
        cancelLabel="Keep subscription"
        destructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />

      <ConfirmationModal
        isOpen={isReactivateConfirmOpen}
        title="Keep subscription active"
        description="Remove the scheduled cancellation and continue automatic renewals?"
        confirmLabel="Continue renewals"
        cancelLabel="Not now"
        onConfirm={handleConfirmReactivate}
        onCancel={() => setIsReactivateConfirmOpen(false)}
      />
    </section>
  );
}
