import Link from "next/link";
import { notFound } from "next/navigation";
import PageHead from "@/components/layout/page-head";
import {
  removeUserByAdminAction,
  toggleUserSuspensionAction,
} from "@/lib/actions/admin.actions";
import { getAdminUserDetail } from "@/lib/utils/admin-queries";

interface AdminUserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <section className="AdminUserDetailPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title={user.username}
        subtitle="Inspect plan state, recent billing, and account-level operational controls."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">Account Details</h2>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Email
              </dt>
              <dd className="mt-1 text-sm">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Clerk ID
              </dt>
              <dd className="mt-1 text-sm">{user.clerkId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Role
              </dt>
              <dd className="mt-1 text-sm capitalize">{user.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                State
              </dt>
              <dd className="mt-1 text-sm">
                {user.suspended ? "Suspended" : "Active"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Plan
              </dt>
              <dd className="mt-1 text-sm">
                {user.planName} (${user.planAmount})
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Billing
              </dt>
              <dd className="mt-1 text-sm">{user.billing}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Plan Expires
              </dt>
              <dd className="mt-1 text-sm">
                {user.expiresOn
                  ? new Date(user.expiresOn).toLocaleString()
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
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

        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">Usage Snapshot</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Conversations
              </p>
              <p className="heading-5 mt-1">{user.conversationCount}</p>
            </div>
            <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Image Generations
              </p>
              <p className="heading-5 mt-1">{user.imageGenerations}</p>
            </div>
            <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Audio Generations
              </p>
              <p className="heading-5 mt-1">{user.audioGenerations}</p>
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
        <h2 className="heading-6 mb-4">Admin Actions</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <form action={toggleUserSuspensionAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="suspended"
              value={(!user.suspended).toString()}
            />
            <button className="btn btn-md btn-outlined" type="submit">
              {user.suspended ? "Reinstate User" : "Suspend User"}
            </button>
          </form>

          <form action={removeUserByAdminAction}>
            <input type="hidden" name="userId" value={user.id} />
            <button
              className="btn btn-md btn-contained bg-red-700 text-white hover:bg-red-800"
              type="submit"
            >
              Remove User
            </button>
          </form>
        </div>
      </article>

      <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="heading-6">Recent Transactions</h2>
          <Link className="btn btn-sm btn-outlined" href="/admin/transactions">
            All Transactions
          </Link>
        </div>

        <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
          {user.transactions.length === 0 && (
            <p className="py-4 text-sm opacity-70">
              No transactions found for this user.
            </p>
          )}

          {user.transactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/admin/transactions/${transaction.id}`}
              className="grid grid-cols-[0.8fr_0.8fr_0.8fr_1fr] gap-3 py-3 text-sm transition-all hover:bg-lightSecondary-300/50 dark:hover:bg-darkSecondary-500/20"
            >
              <span>{transaction.plan}</span>
              <span>${transaction.amount}</span>
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
