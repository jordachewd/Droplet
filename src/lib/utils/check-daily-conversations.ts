import { PLAN_LIMITS } from "@/constants/plans";
import User from "@/lib/database/models/user.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PlanName } from "@/types/PlanData.d";

export interface DailyConversationLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}

function getStartOfDay(now: Date): Date {
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  return startOfDay;
}

type DailyConversationCounterDocument = {
  dailyConversationsStarted?: number;
  dailyConversationWindowStart?: Date | null;
};

export async function checkDailyConversationLimit(
  userId: string,
  planName?: PlanName | null,
  now: Date = new Date(),
): Promise<DailyConversationLimitResult> {
  const normalizedPlanName: PlanName = planName ?? "Lite";
  const limit = PLAN_LIMITS[normalizedPlanName].conversationsPerDay;

  if (limit === -1) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: -1,
    };
  }

  await connectToDatabase();

  const startOfDay = getStartOfDay(now);
  const userCounter = await User.findOne({ clerkId: userId })
    .select("dailyConversationsStarted dailyConversationWindowStart")
    .lean<DailyConversationCounterDocument>();
  const windowStart = userCounter?.dailyConversationWindowStart
    ? new Date(userCounter.dailyConversationWindowStart)
    : null;
  const hasCurrentWindow =
    windowStart instanceof Date &&
    !Number.isNaN(windowStart.getTime()) &&
    windowStart.getTime() >= startOfDay.getTime();
  const used = hasCurrentWindow
    ? Math.max(0, userCounter?.dailyConversationsStarted ?? 0)
    : 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}
