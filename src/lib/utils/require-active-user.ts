import "server-only";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

export type ActiveUserStatus = "active" | "suspended" | "not_provisioned";

export interface ActiveUserResult {
  status: ActiveUserStatus;
}

const ACTIVE_USER_PROJECTION = "suspended";

async function findUserSuspensionState(
  clerkUserId: string,
): Promise<boolean | null> {
  await connectToDatabase();

  const user = await User.findOne({ clerkId: clerkUserId })
    .select(ACTIVE_USER_PROJECTION)
    .lean();

  if (!user) {
    return null;
  }

  return Boolean(user.suspended);
}

export async function requireActiveUser(
  clerkUserId: string,
): Promise<ActiveUserResult> {
  const existingUserSuspension = await findUserSuspensionState(clerkUserId);

  if (existingUserSuspension === true) {
    return { status: "suspended" };
  }

  if (existingUserSuspension === false) {
    return { status: "active" };
  }

  const syncedUser = await ensureUserSynced(clerkUserId);

  if (!syncedUser) {
    return { status: "not_provisioned" };
  }

  return {
    status: syncedUser.suspended ? "suspended" : "active",
  };
}
