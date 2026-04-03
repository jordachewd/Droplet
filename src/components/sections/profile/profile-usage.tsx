import type { PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import UsageMetricRow from "@/components/shared/usage-metric-row";

interface ProfileUsageProps {
  planName: string;
  planLimits: PlanLimits[PlanName];
  imageUsed: number;
  audioUsed: number;
  dailyConversationsUsed: number;
  usagePeriodStart?: Date;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function addThirtyDays(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 30);
  return next;
}

export default function ProfileUsage({
  planName,
  planLimits,
  imageUsed,
  audioUsed,
  dailyConversationsUsed,
  usagePeriodStart,
}: ProfileUsageProps) {
  const usageResetDate = usagePeriodStart
    ? addThirtyDays(usagePeriodStart)
    : null;

  return (
    <section className="ProfileUsage mx-auto flex w-full max-w-7xl flex-col px-4">
      <div className="flex flex-col gap-4 rounded-lg bg-lavenderHaze-100/80 dark:bg-nightIndigo-1000/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="heading-5">Usage</h3>
          <span className="rounded-full border border-slate-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-slate-500">
            {planName}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UsageMetricRow
            label="Daily Conversations"
            used={dailyConversationsUsed}
            limit={planLimits.conversationsPerDay}
            className="rounded-lg bg-dustyBlue-300/20 p-3 dark:bg-nightIndigo-400/10"
          />
          <UsageMetricRow
            label="Image Generations"
            used={imageUsed}
            limit={planLimits.images}
            className="rounded-lg bg-dustyBlue-300/20 p-3 dark:bg-nightIndigo-400/10"
          />
          <UsageMetricRow
            label="Audio Generations"
            used={audioUsed}
            limit={planLimits.audio}
            className="rounded-lg bg-dustyBlue-300/20 p-3 dark:bg-nightIndigo-400/10"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs opacity-80 md:grid-cols-2">
          <span>
            Usage period start:{" "}
            {usagePeriodStart ? formatDate(usagePeriodStart) : "-"}
          </span>
          <span>
            Usage period reset:{" "}
            {usageResetDate ? formatDate(usageResetDate) : "-"}
          </span>
        </div>
      </div>
    </section>
  );
}
