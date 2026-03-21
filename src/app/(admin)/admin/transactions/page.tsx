import PageHead from "@/components/layout/page-head";
import { AdminTransactionsTable } from "@/components/admin/transactions/admin-transactions-table";
import { getAdminTransactions } from "@/lib/utils/admin-queries";
import { getEffectiveCurrencySymbol } from "@/lib/utils/effective-plan-config";

interface AdminTransactionsPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePositivePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function AdminTransactionsPage({
  searchParams,
}: AdminTransactionsPageProps) {
  const { page } = await searchParams;
  const [transactionsResponse, currencySymbol] = await Promise.all([
    getAdminTransactions(parsePositivePage(page)),
    getEffectiveCurrencySymbol(),
  ]);

  return (
    <section className="AdminTransactionsPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Transactions"
        subtitle="Review the billing history attached to user accounts and plan state."
      />

      <AdminTransactionsTable
        transactions={transactionsResponse.items}
        currencySymbol={currencySymbol}
        pagination={{
          total: transactionsResponse.total,
          page: transactionsResponse.page,
          pageSize: transactionsResponse.pageSize,
          totalPages: transactionsResponse.totalPages,
        }}
      />
    </section>
  );
}
