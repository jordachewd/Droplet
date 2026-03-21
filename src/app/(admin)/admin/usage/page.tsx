import PageHead from "@/components/layout/page-head";
import { getAdminUsageAnalytics } from "@/lib/utils/admin-queries";
import { getEffectiveCurrencySymbol } from "@/lib/utils/effective-plan-config";

function formatCost(costCents: number, currencySymbol: string) {
  return `${currencySymbol}${(costCents / 100).toFixed(2)}`;
}

export default async function AdminUsagePage() {
  const [analytics, currencySymbol] = await Promise.all([
    getAdminUsageAnalytics(),
    getEffectiveCurrencySymbol(),
  ]);

  return (
    <section className="AdminUsagePage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Usage"
        subtitle="Request-level telemetry grouped by user, model, request type, provider, and time period."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="admin-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
            Total Events
          </p>
          <p className="heading-4 mt-2">{analytics.summary.totalEvents}</p>
        </article>
        <article className="admin-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
            Blocked Events
          </p>
          <p className="heading-4 mt-2">{analytics.summary.blockedEvents}</p>
        </article>
        <article className="admin-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
            Estimated Cost
          </p>
          <p className="heading-4 mt-2">
            {formatCost(analytics.summary.totalCostCents, currencySymbol)}
          </p>
        </article>
        <article className="admin-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
            Token Throughput
          </p>
          <p className="heading-6 mt-2">
            In {analytics.summary.totalTokensIn} / Out{" "}
            {analytics.summary.totalTokensOut}
          </p>
        </article>
        <article className="admin-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
            Top Personas
          </p>
          <div className="mt-2 flex flex-col gap-1.5 text-xs">
            {analytics.topPersonas.length === 0 && (
              <p className="text-midnightBlue-600 dark:text-lavenderHaze-600">
                No persona usage data yet.
              </p>
            )}
            {analytics.topPersonas.map((persona) => (
              <p key={persona.personaId} className="flex items-center gap-2">
                <span className="truncate font-medium">{persona.label}</span>
                <span className="ml-auto whitespace-nowrap text-midnightBlue-600 dark:text-lavenderHaze-600">
                  {persona.count} ({persona.percentage.toFixed(1)}%)
                </span>
              </p>
            ))}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="admin-surface">
          <h2 className="heading-6 mb-4">Top Users</h2>
          <div className="divide-y divide-slate-300 dark:divide-slate-500">
            {analytics.topUsers.map((user) => (
              <div
                key={user.userId}
                className="grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr] gap-3 py-3 text-sm"
              >
                <span className="font-medium">{user.username}</span>
                <span className="truncate">{user.email}</span>
                <span>{user.count} events</span>
                <span>{formatCost(user.costCents, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-surface">
          <h2 className="heading-6 mb-4">By Model</h2>
          <div className="divide-y divide-slate-300 dark:divide-slate-500">
            {analytics.byModel.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1.3fr_0.5fr_0.6fr] gap-3 py-3 text-sm"
              >
                <span className="truncate">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="admin-surface">
          <h2 className="heading-6 mb-4">By Request Type</h2>
          <div className="divide-y divide-slate-300 dark:divide-slate-500">
            {analytics.byRequestType.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1fr_0.5fr_0.7fr] gap-3 py-3 text-sm"
              >
                <span className="capitalize">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-surface">
          <h2 className="heading-6 mb-4">By Provider</h2>
          <div className="divide-y divide-slate-300 dark:divide-slate-500">
            {analytics.byProvider.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[1fr_0.5fr_0.7fr] gap-3 py-3 text-sm"
              >
                <span className="capitalize">{item.label}</span>
                <span>{item.count}</span>
                <span>{formatCost(item.costCents, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-surface">
          <h2 className="heading-6 mb-4">By Day</h2>
          <div className="divide-y divide-slate-300 dark:divide-slate-500">
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
