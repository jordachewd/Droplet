import "server-only";

import { PLAN_LIMITS, PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type UsageLimitType = "images" | "audio";

interface CheckUsageLimitParams {
  planName?: PlanName | null;
  currentCount?: number | null;
  limitType: UsageLimitType;
  overrideLimit?: number;
  usagePeriodStart?: Date | string | null;
  now?: Date;
  planLimits?: PlanLimits;
}

interface UsageLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  didReset: boolean;
  effectiveCount: number;
}

export function checkUsageLimit({
  planName,
  currentCount,
  limitType,
  overrideLimit,
  usagePeriodStart,
  now = new Date(),
  planLimits = PLAN_LIMITS,
}: CheckUsageLimitParams): UsageLimitResult {
  const normalizedPlanName: PlanName = planName ?? "Lite";
  const limit =
    typeof overrideLimit === "number"
      ? overrideLimit
      : planLimits[normalizedPlanName][limitType];

  if (limit === -1) {
    return {
      allowed: true,
      limit,
      remaining: -1,
      didReset: false,
      effectiveCount: 0,
    };
  }

  const currentUsageCount = currentCount ?? 0;
  const usageStartDate = usagePeriodStart ? new Date(usagePeriodStart) : null;
  const isUsageDateValid =
    usageStartDate !== null && !Number.isNaN(usageStartDate.getTime());
  const didReset =
    isUsageDateValid &&
    now.getTime() - usageStartDate.getTime() >= THIRTY_DAYS_MS;

  const effectiveCount = didReset ? 0 : currentUsageCount;
  const remaining = Math.max(0, limit - effectiveCount);

  return {
    allowed: effectiveCount < limit,
    limit,
    remaining,
    didReset: Boolean(didReset),
    effectiveCount,
  };
}
