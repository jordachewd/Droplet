import { PLAN_LIMITS } from "@/constants/plans";
import Task from "@/lib/database/models/tasks.model";
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

  const used = await Task.countDocuments({
    userId,
    createdAt: {
      $gte: getStartOfDay(now),
    },
  });
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}
