import { PLAN_LIMITS, PlanLimits } from "@/constants/plans";
import User from "@/lib/database/models/user.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PlanName } from "@/types/PlanData.d";

export interface DailyConversationLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}

export interface ClaimDailyConversationSlotResult {
  claimed: boolean;
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
  planLimits: PlanLimits = PLAN_LIMITS,
): Promise<DailyConversationLimitResult> {
  const normalizedPlanName: PlanName = planName ?? "Lite";
  const limit = planLimits[normalizedPlanName].conversationsPerDay;

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

export async function claimDailyConversationSlot(
  userId: string,
  planName?: PlanName | null,
  now: Date = new Date(),
  planLimits: PlanLimits = PLAN_LIMITS,
): Promise<ClaimDailyConversationSlotResult> {
  const normalizedPlanName: PlanName = planName ?? "Lite";
  const limit = planLimits[normalizedPlanName].conversationsPerDay;

  if (limit === -1) {
    return {
      claimed: true,
      limit,
      used: 0,
      remaining: -1,
    };
  }

  await connectToDatabase();

  const startOfDay = getStartOfDay(now);
  const updatedAt = new Date();

  // Attempt 1: Atomically increment within current window if below limit
  const claimedInCurrentWindow =
    await User.findOneAndUpdate<DailyConversationCounterDocument>(
      {
        clerkId: userId,
        dailyConversationWindowStart: { $gte: startOfDay },
        dailyConversationsStarted: { $lt: limit },
      },
      {
        $inc: { dailyConversationsStarted: 1 },
        $set: { updatedAt },
      },
      {
        strict: true,
        upsert: false,
        returnDocument: "after",
        projection: {
          dailyConversationsStarted: 1,
        },
      },
    ).lean<DailyConversationCounterDocument>();

  if (claimedInCurrentWindow) {
    const used = claimedInCurrentWindow.dailyConversationsStarted ?? 1;
    return {
      claimed: true,
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }

  // Attempt 2: Atomically reset stale window and claim first slot of new day
  const claimedWithReset =
    await User.findOneAndUpdate<DailyConversationCounterDocument>(
      {
        clerkId: userId,
        $or: [
          { dailyConversationWindowStart: { $lt: startOfDay } },
          { dailyConversationWindowStart: { $exists: false } },
          { dailyConversationWindowStart: null },
        ],
      },
      {
        $set: {
          dailyConversationsStarted: 1,
          dailyConversationWindowStart: startOfDay,
          updatedAt,
        },
      },
      {
        strict: true,
        upsert: false,
        returnDocument: "after",
        projection: {
          dailyConversationsStarted: 1,
        },
      },
    ).lean<DailyConversationCounterDocument>();

  if (claimedWithReset) {
    return {
      claimed: true,
      limit,
      used: 1,
      remaining: Math.max(0, limit - 1),
    };
  }

  // Both attempts failed: limit reached in the current window
  return {
    claimed: false,
    limit,
    used: limit,
    remaining: 0,
  };
}
