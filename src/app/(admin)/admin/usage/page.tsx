import PageHead from "@/components/layout/page-head";
import { getAdminUsageAnalytics } from "@/lib/utils/admin-queries";

function formatCost(costCents: number) {
  return `$${(costCents / 100).toFixed(2)}`;
}

export default async function AdminUsagePage() {
  const analytics = await getAdminUsageAnalytics();

  return (
    <section className="AdminUsagePage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Usage"
        subtitle="Request-level telemetry grouped by user, model, request type, provider, and time period."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Total Events
          </p>
          <p className="heading-4 mt-2">{analytics.summary.totalEvents}</p>
        </article>
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Blocked Events
          </p>
          <p className="heading-4 mt-2">{analytics.summary.blockedEvents}</p>
        </article>
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Estimated Cost
          </p>
          <p className="heading-4 mt-2">
            {formatCost(analytics.summary.totalCostCents)}
          </p>
        </article>
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Token Throughput
          </p>
          <p className="heading-6 mt-2">
            In {analytics.summary.totalTokensIn} / Out{" "}
            {analytics.summary.totalTokensOut}
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">Top Users</h2>
          <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
            {analytics.topUsers.map((user) => (
              <div
                key={user.userId}
                className="grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr] gap-3 py-3 text-sm"
              >
                <span className="font-medium">{user.username}</span>
                <span className="truncate">{user.email}</span>
                <span>{user.count} events</span>
                <span>{formatCost(user.costCents)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">By Model</h2>
          <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
            {analytics.byModel.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1.3fr_0.5fr_0.6fr] gap-3 py-3 text-sm"
              >
                <span className="truncate">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">By Request Type</h2>
          <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
            {analytics.byRequestType.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1fr_0.5fr_0.7fr] gap-3 py-3 text-sm"
              >
                <span className="capitalize">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">By Provider</h2>
          <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
            {analytics.byProvider.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1fr_0.5fr_0.7fr] gap-3 py-3 text-sm"
              >
                <span className="capitalize">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-4">By Day</h2>
          <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
            {analytics.byDay.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1fr_0.5fr] gap-3 py-3 text-sm"
              >
                <span>{item.label}</span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
