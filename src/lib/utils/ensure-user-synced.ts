import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import serializeForClient from "@/lib/utils/serialize-for-client";
import type { UserData } from "@/types/UserData.d";

/**
 * Ensures a MongoDB user record exists for the given Clerk user ID.
 * If the record is missing (e.g. webhook delay/failure), self-heals
 * by fetching user data from Clerk and creating the record with
 * Lite plan defaults.
 *
 * Returns serialized user data, or null if self-healing fails.
 */
export async function ensureUserSynced(
  clerkUserId: string,
): Promise<UserData | null> {
  try {
    await connectToDatabase();

    const existingUser = await User.findOne({ clerkId: clerkUserId })
      .select(
        "clerkId username email role plan firstName lastName userimg registerAt updatedAt",
      )
      .lean();

    if (existingUser) {
      return serializeForClient(existingUser) as UserData;
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

    const newUser = await User.create({
      clerkId: clerkUserId,
      username,
      email,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      userimg: clerkUser.imageUrl ?? "",
      registerAt: new Date(clerkUser.createdAt),
    });

    // Set Clerk publicMetadata to match webhook behavior
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        userId: newUser._id.toString(),
        role: newUser.role,
        userImg: clerkUser.imageUrl ?? "",
      },
    });

    const created = await User.findById(newUser._id)
      .select(
        "clerkId username email role plan firstName lastName userimg registerAt updatedAt",
      )
      .lean();

    return created ? (serializeForClient(created) as UserData) : null;
  } catch (error) {
    process.stderr.write(
      `[ensure-user-synced] Failed for ${clerkUserId}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return null;
  }
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
