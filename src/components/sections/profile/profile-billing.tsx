import getFormattedDate from "@/lib/utils/getFormattedDate";
import classNames from "classnames";
import { Transaction } from "@/types/TransactionData.d";
import { TooltipArrow } from "@/components/shared/tooltip-arrow";

interface BillingProps {
  stripeId: string | null;
  userTxns: Transaction[] | null;
}

export default function ProfileBilling({ stripeId, userTxns }: BillingProps) {
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

  return (
    <section className="ProfileBilling mx-auto flex w-full max-w-7xl flex-col gap-6 px-4">
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
            <TooltipArrow title="Invoice" placement="top">
              <i
                className="bi bi-cloud-download ml-4 text-base"
                aria-hidden="true"
              ></i>
            </TooltipArrow>
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
                  ${txn.amount}
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
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No transactions yet.
        </p>
      )}
    </section>
  );
}
