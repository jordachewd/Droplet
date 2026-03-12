import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { CreateUserParams, UpdateUserParams } from "@/types/UserData.d";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import User from "@/lib/database/models/user.model";
import Transaction from "@/lib/database/models/transaction.model";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
import serializeForClient from "@/lib/utils/serialize-for-client";

type ClerkWebhookEmailAddress = {
  id?: string | null;
  email_address?: string | null;
};

type ClerkWebhookUserBase = {
  id?: string | null;
  email_addresses?: ClerkWebhookEmailAddress[] | null;
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
};

type ClerkWebhookUserCreatedData = ClerkWebhookUserBase & {
  id: string;
  created_at: number | string | Date;
};

type ClerkWebhookUserUpdatedData = ClerkWebhookUserBase & {
  id: string;
  updated_at: number | string | Date;
};

type ClerkWebhookUserDeletedData = {
  id?: string | null;
};

type ClerkBackendEmailAddress = {
  id: string;
  emailAddress: string;
};

type ClerkBackendUserRecord = {
  emailAddresses: ClerkBackendEmailAddress[];
  primaryEmailAddressId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
};

async function createUserFromWebhook(user: CreateUserParams) {
  await connectToDatabase();

  try {
    const newUser = await User.create(user);
    return newUser ? serializeForClient(newUser) : null;
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      return findUserByClerkId(user.clerkId);
    }

    throw error;
  }
}

async function findUserByClerkId(clerkId: string) {
  await connectToDatabase();

  const existingUser = await User.findOne({ clerkId });
  return existingUser ? serializeForClient(existingUser) : null;
}

function isMongoDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function logUserDeletedCleanupFailure(step: string) {
  process.stderr.write(
    `[clerk-webhook] user.deleted ${step} cleanup failed.\n`,
  );
}

function logWebhookProcessingFailure(eventType: string) {
  process.stderr.write(`[clerk-webhook] ${eventType} processing failed.\n`);
}

function toNonEmptyString(value?: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function resolveWebhookPrimaryEmailAddress(
  emailAddresses?: ClerkWebhookEmailAddress[] | null,
  primaryEmailAddressId?: string | null,
): string | null {
  if (!emailAddresses?.length) {
    return null;
  }

  const primaryEmailAddress = primaryEmailAddressId
    ? emailAddresses.find(
        (emailAddress) => emailAddress.id === primaryEmailAddressId,
      )
    : null;

  return (
    toNonEmptyString(primaryEmailAddress?.email_address) ??
    toNonEmptyString(emailAddresses[0]?.email_address)
  );
}

function resolveClerkPrimaryEmailAddress(
  clerkUser: ClerkBackendUserRecord | null,
): string | null {
  if (!clerkUser?.emailAddresses.length) {
    return null;
  }

  const primaryEmailAddress = clerkUser.primaryEmailAddressId
    ? clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )
    : null;

  return (
    toNonEmptyString(primaryEmailAddress?.emailAddress) ??
    toNonEmptyString(clerkUser.emailAddresses[0]?.emailAddress)
  );
}

function normalizeFallbackUsernameSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
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
    .filter((value): value is string => Boolean(value))
    .join("-");
  const normalizedBase = normalizeFallbackUsernameSegment(
    emailLocalPart ?? fullName ?? "user",
  );
  const usernameBase = normalizedBase || "user";
  const usernameSuffix = clerkId
    .replace(/^user_/, "")
    .slice(-8)
    .toLowerCase();

  return usernameSuffix ? `${usernameBase}-${usernameSuffix}` : usernameBase;
}

async function resolveUserCreatedParams(
  clerkUserData: ClerkWebhookUserCreatedData,
): Promise<CreateUserParams | null> {
  const webhookEmail = resolveWebhookPrimaryEmailAddress(
    clerkUserData.email_addresses,
    clerkUserData.primary_email_address_id,
  );
  const webhookUsername = toNonEmptyString(clerkUserData.username);
  let fallbackClerkUser: ClerkBackendUserRecord | null = null;

  if (!webhookEmail || !webhookUsername) {
    const client = await clerkClient();
    fallbackClerkUser = (await client.users.getUser(
      clerkUserData.id,
    )) as ClerkBackendUserRecord;
  }

  const email =
    webhookEmail ?? resolveClerkPrimaryEmailAddress(fallbackClerkUser);

  if (!email) {
    return null;
  }

  const firstName =
    toNonEmptyString(clerkUserData.first_name) ??
    toNonEmptyString(fallbackClerkUser?.firstName) ??
    "";
  const lastName =
    toNonEmptyString(clerkUserData.last_name) ??
    toNonEmptyString(fallbackClerkUser?.lastName) ??
    "";

  return {
    clerkId: clerkUserData.id,
    userimg:
      toNonEmptyString(clerkUserData.image_url) ??
      toNonEmptyString(fallbackClerkUser?.imageUrl) ??
      "",
    username:
      webhookUsername ??
      toNonEmptyString(fallbackClerkUser?.username) ??
      generateFallbackUsername({
        clerkId: clerkUserData.id,
        email,
        firstName,
        lastName,
      }),
    email,
    firstName,
    lastName,
    registerAt: new Date(clerkUserData.created_at),
  };
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = evt.type;

  try {
    // CREATE USER
    if (eventType === "user.created") {
      const clerkUserData = evt.data as ClerkWebhookUserCreatedData;
      const { id, image_url } = clerkUserData;

      if (!id) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      const existingUser = await findUserByClerkId(id);
      let createdUserParams: CreateUserParams | null = null;
      let syncedUser = existingUser;

      if (!syncedUser) {
        createdUserParams = await resolveUserCreatedParams(clerkUserData);

        if (!createdUserParams) {
          return NextResponse.json(
            {
              message: "Webhook error",
              error: "Failed to create user",
            },
            { status: 500 },
          );
        }

        syncedUser = await createUserFromWebhook(createdUserParams);
      }

      if (!syncedUser) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Failed to create user",
          },
          { status: 500 },
        );
      }

      // Set publicMetadata for Clerk user
      const client = await clerkClient();
      await client.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: syncedUser._id,
          role: syncedUser.role,
          userImg: image_url ?? createdUserParams?.userimg ?? "",
        },
      });

      return NextResponse.json({ message: "OK", user: syncedUser });
    }

    // UPDATE USER
    if (eventType === "user.updated") {
      const clerkUserData = evt.data as ClerkWebhookUserUpdatedData;
      const {
        id,
        updated_at,
        first_name,
        last_name,
        image_url,
        username,
        email_addresses,
        primary_email_address_id,
      } = clerkUserData;

      if (!id) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      const user: UpdateUserParams = {
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        updatedAt: new Date(updated_at),
        userimg: image_url ?? "",
      };
      const email = resolveWebhookPrimaryEmailAddress(
        email_addresses,
        primary_email_address_id,
      );
      const normalizedUsername = toNonEmptyString(username);

      if (email) {
        user.email = email;
      }

      if (normalizedUsername) {
        user.username = normalizedUsername;
      }

      await connectToDatabase();
      const updatedUser = await User.findOneAndUpdate({ clerkId: id }, user, {
        returnDocument: "after",
        strict: true,
        upsert: false,
      });

      if (!updatedUser) {
        return NextResponse.json({ message: "OK", user: null });
      }

      return NextResponse.json({ message: "OK", user: updatedUser });
    }

    // DELETE USER
    if (eventType === "user.deleted") {
      const { id } = evt.data as ClerkWebhookUserDeletedData;

      if (!id) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      await connectToDatabase();
      const clerkId = id;
      let deletedUser: unknown = null;
      let deletedTransactions: { deletedCount?: number } | null = null;
      let deletedTasks: { deletedCount?: number } | null = null;
      let deletedObjectsCount = 0;

      try {
        const userToDelete = await User.findOne({ clerkId });
        deletedUser = userToDelete
          ? await User.findByIdAndDelete(userToDelete._id)
          : null;
      } catch {
        logUserDeletedCleanupFailure("user");
      }

      try {
        deletedTransactions = await Transaction.deleteMany({ clerkId });
      } catch {
        logUserDeletedCleanupFailure("transaction");
      }

      try {
        deletedTasks = await Task.deleteMany({ userId: clerkId });
      } catch {
        logUserDeletedCleanupFailure("task");
      }

      try {
        deletedObjectsCount = await deleteS3Prefix(`${clerkId}/`);
      } catch {
        logUserDeletedCleanupFailure("s3");
      }

      return NextResponse.json({
        message: "OK",
        deletedUser,
        deletedTransactions,
        deletedTasks,
        deletedObjectsCount,
      });
    }
  } catch {
    logWebhookProcessingFailure(eventType);

    return NextResponse.json(
      {
        message: "Webhook error",
        error: "Failed to process Clerk webhook",
      },
      { status: 500 },
    );
  }

  return new Response("Droplet | Clerk Webhook Response", { status: 200 });
}
