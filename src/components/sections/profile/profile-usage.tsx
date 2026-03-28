import classNames from "classnames";
import type { PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";

interface UsageMetric {
  label: string;
  used: number;
  limit: number;
}

interface ProfileUsageProps {
  planName: PlanName;
  planLimits: PlanLimits[PlanName];
  imageUsed: number;
  audioUsed: number;
  videoUsed: number;
  dailyConversationsUsed: number;
  usagePeriodStart?: Date;
}

function formatLimit(limit: number): string {
  return limit === -1 ? "Unlimited" : String(limit);
}

function resolveProgressPercent(used: number, limit: number): number {
  if (limit === -1) {
    return 100;
  }

  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
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

function UsageMetricRow({ label, used, limit }: UsageMetric) {
  const progress = resolveProgressPercent(used, limit);

  return (
    <div className="ProfileUsageMetric flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold">
          {used} / {formatLimit(limit)}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-lavenderHaze-300/70 dark:bg-nightIndigo-500/50">
        <div
          className={classNames(
            "h-full rounded-full bg-twilightPurple-500 transition-all dark:bg-dustyBlue-500",
            progress >= 90 && limit !== -1 && "bg-amber-500 dark:bg-amber-400",
          )}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function ProfileUsage({
  planName,
  planLimits,
  imageUsed,
  audioUsed,
  videoUsed,
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UsageMetricRow
            label="Image Generations"
            used={imageUsed}
            limit={planLimits.images}
          />
          <UsageMetricRow
            label="Audio Generations"
            used={audioUsed}
            limit={planLimits.audio}
          />
          <UsageMetricRow
            label="Video Generations"
            used={videoUsed}
            limit={planLimits.video}
          />
          <UsageMetricRow
            label="Daily Conversations"
            used={dailyConversationsUsed}
            limit={planLimits.conversationsPerDay}
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
