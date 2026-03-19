import { notFound } from "next/navigation";
import PageHead from "@/components/layout/page-head";
import { getAdminTransactionDetail } from "@/lib/utils/admin-queries";
import { getEffectiveCurrencySymbol } from "@/lib/utils/effective-plan-config";

interface AdminTransactionDetailPageProps {
  params: Promise<{ transactionId: string }>;
}

export default async function AdminTransactionDetailPage({
  params,
}: AdminTransactionDetailPageProps) {
  const { transactionId } = await params;
  const [transaction, currencySymbol] = await Promise.all([
    getAdminTransactionDetail(transactionId),
    getEffectiveCurrencySymbol(),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <section className="AdminTransactionDetailPage mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHead
        title="Transaction Detail"
        subtitle="View billing metadata, effective dates, and the associated user account."
      />

      <article className="admin-surface">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Stripe Session
            </dt>
            <dd className="mt-1 text-sm">{transaction.stripeId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Clerk ID
            </dt>
            <dd className="mt-1 text-sm">{transaction.clerkId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Plan
            </dt>
            <dd className="mt-1 text-sm">{transaction.plan}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Billing
            </dt>
            <dd className="mt-1 text-sm">{transaction.billing}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Amount
            </dt>
            <dd className="mt-1 text-sm">
              {currencySymbol}
              {transaction.amount}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Purchased
            </dt>
            <dd className="mt-1 text-sm">
              {transaction.createdAt
                ? new Date(transaction.createdAt).toLocaleString()
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Expires
            </dt>
            <dd className="mt-1 text-sm">
              {transaction.expiresOn
                ? new Date(transaction.expiresOn).toLocaleString()
                : "-"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="admin-surface">
        <h2 className="heading-6 mb-4">Associated User</h2>
        {transaction.user ? (
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Username
              </dt>
              <dd className="mt-1 text-sm">{transaction.user.username}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Email
              </dt>
              <dd className="mt-1 text-sm">{transaction.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Role
              </dt>
              <dd className="mt-1 text-sm capitalize">
                {transaction.user.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Current Plan
              </dt>
              <dd className="mt-1 text-sm">{transaction.user.currentPlan}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm opacity-70">
            The associated user record could not be loaded.
          </p>
        )}
      </article>
    </section>
  );
}
