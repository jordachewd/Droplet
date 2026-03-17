import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import { getAdminTransactions } from "@/lib/utils/admin-queries";
import { getEffectiveCurrencySymbol } from "@/lib/utils/effective-plan-config";

export default async function AdminTransactionsPage() {
  const [transactions, currencySymbol] = await Promise.all([
    getAdminTransactions(),
    getEffectiveCurrencySymbol(),
  ]);

  return (
    <section className="AdminTransactionsPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Transactions"
        subtitle="Review the billing history attached to user accounts and plan state."
      />

      <div className="overflow-hidden rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
        <div className="grid grid-cols-[1fr_1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-lightBorders-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide opacity-70 dark:border-darkBorders-500">
          <span>User</span>
          <span>Email</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
          {transactions.length === 0 && (
            <p className="px-4 py-6 text-sm opacity-70">
              No transactions recorded yet.
            </p>
          )}

          {transactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/admin/transactions/${transaction.id}`}
              className="grid grid-cols-[1fr_1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm transition-all hover:bg-lightSecondary-300/50 dark:hover:bg-darkSecondary-500/20"
            >
              <span className="font-medium">{transaction.username}</span>
              <span className="truncate">{transaction.email}</span>
              <span>{transaction.plan}</span>
              <span>
                {currencySymbol}
                {transaction.amount} /{" "}
                {transaction.billing === "Monthly" ? "Mo" : "Yr"}
              </span>
              <span>
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleDateString()
                  : "-"}
              </span>
              <span>{transaction.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
