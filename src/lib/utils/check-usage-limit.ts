import { PLAN_LIMITS } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type UsageLimitType = "images" | "audio";

interface CheckUsageLimitParams {
  planName?: PlanName | null;
  currentCount?: number | null;
  limitType: UsageLimitType;
  usagePeriodStart?: Date | string | null;
  now?: Date;
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
  usagePeriodStart,
  now = new Date(),
}: CheckUsageLimitParams): UsageLimitResult {
  const normalizedPlanName: PlanName = planName ?? "Lite";
  const limit = PLAN_LIMITS[normalizedPlanName][limitType];

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
