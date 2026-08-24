import classNames from "classnames";

interface UsageMetricRowProps {
  label: string;
  used: number;
  limit: number;
  details?: string;
  className?: string;
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

export default function UsageMetricRow({
  label,
  used,
  limit,
  details,
  className,
}: UsageMetricRowProps) {
  const progress = resolveProgressPercent(used, limit);
  const isNearLimit = limit !== -1 && progress >= 90;

  return (
    <div
      className={classNames("UsageMetricRow flex flex-col gap-2", className)}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="font-semibold">
          {used} / {formatLimit(limit)}
        </p>
      </div>

      {details && (
        <p className="text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
          {details}
        </p>
      )}

      <div className="h-2.5 w-full rounded-full bg-twilightPurple-400/10 dark:bg-dustyBlue-500/10">
        <div
          className={classNames(
            "h-full rounded-full transition-all bg-dustyBlue-500",
            isNearLimit && "bg-amber-500",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
