import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { isMongoDuplicateKeyError } from "@/lib/utils/type-guards";
import type { UserData } from "@/types/UserData.d";

const USER_SYNC_PROJECTION =
  "clerkId username email role plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart";
const RECENT_RESULT_TTL_MS = 5_000;
const FAILURE_LOG_WINDOW_MS = 30_000;
const recentEnsureUserSyncResults = new Map<
  string,
  { value: UserData | null; expiresAt: number }
>();
const inFlightEnsureUserSync = new Map<string, Promise<UserData | null>>();
const lastFailureLogAtByUser = new Map<string, number>();

async function findSyncedUserByClerkId(
  clerkUserId: string,
): Promise<UserData | null> {
  const user = await User.findOne({ clerkId: clerkUserId })
    .select(USER_SYNC_PROJECTION)
    .lean();

  return user ? (serializeForClient(user) as UserData) : null;
}

/**
 * Ensures a MongoDB user record exists for the given Clerk user ID.
 * If the record is missing (e.g. webhook delay/failure), self-heals
 * by fetching user data from Clerk and creating the record with
 * Lite plan defaults.
 *
 * Returns serialized user data, or null if self-healing fails.
 */
async function ensureUserSyncedUncached(
  clerkUserId: string,
): Promise<UserData | null> {
  try {
    await connectToDatabase();

    const existingUser = await findSyncedUserByClerkId(clerkUserId);
    if (existingUser) {
      return existingUser;
    }

    // Self-heal: fetch from Clerk and create MongoDB record
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);

    const email = resolveClerkEmail(clerkUser);
    if (!email) {
      process.stderr.write(
        `[ensure-user-synced] No email found for Clerk user ${clerkUserId}.\n`,
      );
      return null;
    }

    const username =
      clerkUser.username?.trim() ||
      generateFallbackUsername({
        clerkId: clerkUserId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      });

    let newUserId: string | null = null;
    let newUserRole = "client";

    try {
      const newUser = await User.create({
        clerkId: clerkUserId,
        username,
        email,
        firstName: clerkUser.firstName ?? "",
        lastName: clerkUser.lastName ?? "",
        userimg: clerkUser.imageUrl ?? "",
        registerAt: new Date(clerkUser.createdAt),
      });

      newUserId = newUser._id.toString();
      newUserRole = newUser.role;
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        const raceWinnerUser = await findSyncedUserByClerkId(clerkUserId);
        return raceWinnerUser;
      }

      throw error;
    }

    if (!newUserId) {
      return null;
    }

    try {
      // Metadata sync is non-fatal; webhook or future sign-ins can reconcile.
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: {
          userId: newUserId,
          role: newUserRole,
          userImg: clerkUser.imageUrl ?? "",
        },
      });
    } catch (error) {
      process.stderr.write(
        `[ensure-user-synced] Metadata sync failed for ${clerkUserId}: ${error instanceof Error ? error.message : "unknown"}; continuing with MongoDB user.\n`,
      );
    }

    const created = await User.findById(newUserId)
      .select(USER_SYNC_PROJECTION)
      .lean();

    return created ? (serializeForClient(created) as UserData) : null;
  } catch (error) {
    const now = Date.now();
    const lastLoggedAt = lastFailureLogAtByUser.get(clerkUserId) ?? 0;

    if (now - lastLoggedAt >= FAILURE_LOG_WINDOW_MS) {
      process.stderr.write(
        `[ensure-user-synced] Failed for ${clerkUserId}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      lastFailureLogAtByUser.set(clerkUserId, now);
    }

    return null;
  }
}

export async function ensureUserSynced(
  clerkUserId: string,
): Promise<UserData | null> {
  if (process.env.NODE_ENV === "test") {
    return ensureUserSyncedUncached(clerkUserId);
  }

  const now = Date.now();
  const recentResult = recentEnsureUserSyncResults.get(clerkUserId);

  if (recentResult && recentResult.expiresAt > now) {
    return recentResult.value;
  }

  const activeRequest = inFlightEnsureUserSync.get(clerkUserId);
  if (activeRequest) {
    return activeRequest;
  }

  const request = ensureUserSyncedUncached(clerkUserId)
    .then((value) => {
      recentEnsureUserSyncResults.set(clerkUserId, {
        value,
        expiresAt: Date.now() + RECENT_RESULT_TTL_MS,
      });

      return value;
    })
    .finally(() => {
      inFlightEnsureUserSync.delete(clerkUserId);
    });

  inFlightEnsureUserSync.set(clerkUserId, request);
  return request;
}

function resolveClerkEmail(
  clerkUser: Awaited<
    ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>
  >,
): string | null {
  const addresses = clerkUser.emailAddresses;
  if (!addresses?.length) return null;

  const primary = clerkUser.primaryEmailAddressId
    ? addresses.find((a) => a.id === clerkUser.primaryEmailAddressId)
    : null;

  const email = primary?.emailAddress || addresses[0]?.emailAddress;
  return email?.trim() || null;
}

function generateFallbackUsername({
  clerkId,
  email,
  firstName,
  lastName,
}: {
  clerkId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const emailLocalPart = email?.split("@")[0] ?? null;
  const fullName = [firstName, lastName]
    .filter((v): v is string => Boolean(v))
    .join("-");
  const raw = emailLocalPart ?? fullName ?? "user";
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const base = normalized || "user";
  const suffix = clerkId
    .replace(/^user_/, "")
    .slice(-8)
    .toLowerCase();

  return suffix ? `${base}-${suffix}` : base;
}
