import Link from "next/link";
import { notFound } from "next/navigation";
import PageHead from "@/components/layout/page-head";
import {
  removeUserByAdminAction,
  toggleUserSuspensionAction,
} from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import UsageMetricRow from "@/components/shared/usage-metric-row";
import { getAdminUserDetail } from "@/lib/utils/admin-queries";
import { getEffectiveCurrencySymbol } from "@/lib/utils/effective-plan-config";

interface AdminUserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;
  const [user, currencySymbol] = await Promise.all([
    getAdminUserDetail(userId),
    getEffectiveCurrencySymbol(),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <section className="AdminUserDetailPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title={user.username}
        subtitle="Inspect plan state, recent billing, and account-level operational controls."
      />

      <div className="flex flex-col gap-6">
        <article className="admin-surface">
          <h2 className="heading-6 mb-4">Account Details</h2>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Email
              </dt>
              <dd className="mt-1 text-sm">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Clerk ID
              </dt>
              <dd className="mt-1 text-sm">{user.clerkId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Role
              </dt>
              <dd className="mt-1 text-sm capitalize">{user.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                State
              </dt>
              <dd className="mt-1 text-sm">
                {user.suspended ? "Suspended" : "Active"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Plan
              </dt>
              <dd className="mt-1 text-sm">
                {user.role === "admin"
                  ? user.planName
                  : `${user.planName} (${currencySymbol}${user.planAmount})`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Billing
              </dt>
              <dd className="mt-1 text-sm">{user.billing}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Plan Expires
              </dt>
              <dd className="mt-1 text-sm">
                {user.expiresOn
                  ? new Date(user.expiresOn).toLocaleString()
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-midnightBlue-700 dark:text-lavenderHaze-700">
                Registered
              </dt>
              <dd className="mt-1 text-sm">
                {user.registerAt
                  ? new Date(user.registerAt).toLocaleString()
                  : "-"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="admin-surface">
          <h2 className="heading-6 mb-4">Usage Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <UsageMetricRow
              label="Daily Conversations"
              used={user.conversationUsage.used}
              limit={user.conversationUsage.limit}
              className="admin-surface-subtle"
            />
            <UsageMetricRow
              label="Prompts / Conversation (Peak)"
              used={user.promptUsage.used}
              limit={user.promptUsage.limit}
              details={`Total prompts across tasks: ${user.promptUsage.total}`}
              className="admin-surface-subtle"
            />
            <UsageMetricRow
              label="Image Generations"
              used={user.mediaUsage.images.used}
              limit={user.mediaUsage.images.limit}
              className="admin-surface-subtle"
            />
            <UsageMetricRow
              label="Audio Generations"
              used={user.mediaUsage.audio.used}
              limit={user.mediaUsage.audio.limit}
              className="admin-surface-subtle"
            />
            <UsageMetricRow
              label="Trial Image Usage"
              used={user.trialUsage.images.used}
              limit={user.trialUsage.images.limit}
              className="admin-surface-subtle"
            />
            <UsageMetricRow
              label="Trial Audio Usage"
              used={user.trialUsage.audio.used}
              limit={user.trialUsage.audio.limit}
              className="admin-surface-subtle"
            />
          </div>
        </article>
      </div>

      <article className="admin-surface">
        <h2 className="heading-6 mb-4">Admin Actions</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <AdminManagedForm
            action={toggleUserSuspensionAction}
            confirmMessage={`Are you sure you want to ${user.suspended ? "reinstate" : "suspend"} this user?`}
          >
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="suspended"
              value={(!user.suspended).toString()}
            />
            <AdminFormSubmitButton
              label={user.suspended ? "Reinstate User" : "Suspend User"}
              pendingLabel="Updating user..."
            />
          </AdminManagedForm>

          {user.role !== "admin" && (
            <AdminManagedForm
              action={removeUserByAdminAction}
              confirmMessage="Are you sure you want to permanently remove this user? This will delete all their data including conversations, transactions, and files. This action cannot be undone."
            >
              <input type="hidden" name="userId" value={user.id} />
              <AdminFormSubmitButton
                label="Remove User"
                pendingLabel="Removing user..."
                className="text-white bg-red-700 hover:bg-red-800 border-red-700 hover:border-red-800"
              />
            </AdminManagedForm>
          )}
        </div>
      </article>

      <article className="admin-surface">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="heading-6">Recent Transactions</h2>
          <Link className="btn btn-sm btn-outlined" href="/admin/transactions">
            All Transactions
          </Link>
        </div>

        <div className="divide-y divide-slate-300 dark:divide-slate-500">
          {user.transactions.length === 0 && (
            <p className="py-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
              No transactions found for this user.
            </p>
          )}

          {user.transactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/admin/transactions/${transaction.id}`}
              className="grid grid-cols-[0.8fr_0.8fr_0.8fr_1fr] gap-3 py-3 text-sm transition-all hover:bg-lavenderHaze-300/50 dark:hover:bg-nightIndigo-500/20"
            >
              <span>{transaction.plan}</span>
              <span>
                {currencySymbol}
                {transaction.amount}
              </span>
              <span>{transaction.billing}</span>
              <span>
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
