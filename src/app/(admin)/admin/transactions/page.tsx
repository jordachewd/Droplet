import PageHead from "@/components/layout/page-head";
import { AdminTransactionsTable } from "@/components/admin/transactions/admin-transactions-table";
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

      <AdminTransactionsTable
        transactions={transactions}
        currencySymbol={currencySymbol}
      />
    </section>
  );
}
