import "server-only";
import User from "@/lib/database/models/user.model";

export type MediaUsageLimitType = "images" | "audio";
export type MediaCounterScope = "plan" | "trial";

export interface MediaSlotClaimResult {
  claimed: boolean;
  limit: number;
  remaining: number;
}

export function resolveMediaCounterField(
  limitType: MediaUsageLimitType,
  counterScope: MediaCounterScope,
):
  | "plan.imageGenerations"
  | "plan.audioGenerations"
  | "plan.trialUsage.trialImageGenerations"
  | "plan.trialUsage.trialAudioGenerations" {
  if (counterScope === "trial") {
    if (limitType === "images") {
      return "plan.trialUsage.trialImageGenerations";
    }

    return "plan.trialUsage.trialAudioGenerations";
  }

  if (limitType === "images") {
    return "plan.imageGenerations";
  }

  return "plan.audioGenerations";
}

export async function claimMediaGenerationSlot({
  userId,
  limitType,
  limit,
  counterScope,
}: {
  userId: string;
  limitType: MediaUsageLimitType;
  limit: number;
  counterScope: MediaCounterScope;
}): Promise<MediaSlotClaimResult> {
  if (limit === -1) {
    return {
      claimed: true,
      limit,
      remaining: -1,
    };
  }

  const counterField = resolveMediaCounterField(limitType, counterScope);
  const updatedUser = await User.findOneAndUpdate(
    {
      clerkId: userId,
      [counterField]: { $lt: limit },
    },
    {
      $inc: {
        [counterField]: 1,
      },
    },
    {
      new: true,
      strict: true,
      upsert: false,
    },
  );

  if (!updatedUser) {
    return {
      claimed: false,
      limit,
      remaining: 0,
    };
  }

  const nextCountRaw =
    counterScope === "trial"
      ? limitType === "images"
        ? updatedUser.plan?.trialUsage?.trialImageGenerations
        : updatedUser.plan?.trialUsage?.trialAudioGenerations
      : limitType === "images"
        ? updatedUser.plan?.imageGenerations
        : updatedUser.plan?.audioGenerations;
  const nextCount =
    typeof nextCountRaw === "number" && Number.isFinite(nextCountRaw)
      ? nextCountRaw
      : 0;

  return {
    claimed: true,
    limit,
    remaining: Math.max(0, limit - nextCount),
  };
}

export async function rollbackMediaGenerationSlot({
  userId,
  limitType,
  counterScope,
}: {
  userId: string;
  limitType: MediaUsageLimitType;
  counterScope: MediaCounterScope;
}): Promise<void> {
  const counterField = resolveMediaCounterField(limitType, counterScope);

  await User.findOneAndUpdate(
    {
      clerkId: userId,
      [counterField]: { $gt: 0 },
    },
    {
      $inc: {
        [counterField]: -1,
      },
    },
    {
      strict: true,
      upsert: false,
    },
  );
}
