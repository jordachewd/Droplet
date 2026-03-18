import type { UserJSON } from "@clerk/backend";
import { clerkClient } from "@clerk/nextjs/server";
import { type WebhookEvent, verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { CreateUserParams, UpdateUserParams } from "@/types/UserData.d";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import User from "@/lib/database/models/user.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { z } from "zod";

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

const supportedClerkEventSchema = z
  .object({
    type: nonEmptyStringSchema,
    data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const clerkWebhookEmailSchema = z
  .object({
    id: z.string().optional(),
    email_address: nonEmptyStringSchema,
  })
  .passthrough();

const userCreatedPayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    image_url: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    created_at: z.union([z.string(), z.number(), z.date()]),
    email_addresses: z.array(clerkWebhookEmailSchema).nullable().optional(),
    primary_email_address_id: z.string().nullable().optional(),
  })
  .passthrough();

const userUpdatedPayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    updated_at: z.union([z.string(), z.number(), z.date()]),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    email_addresses: z.array(clerkWebhookEmailSchema).nullable().optional(),
    primary_email_address_id: z.string().nullable().optional(),
  })
  .passthrough();

const userDeletedPayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
  })
  .passthrough();

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

  const existingUser = await User.findOne(
    { clerkId },
    "_id clerkId email username firstName lastName userimg registerAt",
    { lean: true },
  );
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

function logUserDeletedCleanupSummary({
  deletedUserCount,
  deletedTransactionCount,
  deletedTaskCount,
  deletedObjectCount,
}: {
  deletedUserCount: number | null;
  deletedTransactionCount: number | null;
  deletedTaskCount: number | null;
  deletedObjectCount: number | null;
}) {
  process.stderr.write(
    `[clerk-webhook] user.deleted cleanup counts user=${deletedUserCount ?? "unknown"} transactions=${deletedTransactionCount ?? "unknown"} tasks=${deletedTaskCount ?? "unknown"} s3Objects=${deletedObjectCount ?? "unknown"}\n`,
  );
}

function logWebhookProcessingFailure(eventType: string) {
  process.stderr.write(`[clerk-webhook] ${eventType} processing failed.\n`);
}

function logWebhookVerificationFailure() {
  process.stderr.write("[clerk-webhook] Verification failed.\n");
}

function toNonEmptyString(value?: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function resolveWebhookPrimaryEmailAddress(
  emailAddresses: UserJSON["email_addresses"] | null | undefined,
  primaryEmailAddressId:
    | UserJSON["primary_email_address_id"]
    | null
    | undefined,
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
  clerkUserData: UserJSON,
): Promise<CreateUserParams | null> {
  const webhookEmail = resolveWebhookPrimaryEmailAddress(
    clerkUserData.email_addresses,
    clerkUserData.primary_email_address_id,
  );
  const webhookUsername = toNonEmptyString(clerkUserData.username);
  let fallbackClerkUser: ClerkBackendUserRecord | null = null;

  if (!webhookEmail) {
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

export async function POST(req: NextRequest) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  let evt: WebhookEvent;

  try {
    evt = await verifyWebhook(req, { signingSecret });
  } catch {
    logWebhookVerificationFailure();

    return new Response("Webhook verification failed", {
      status: 400,
    });
  }

  const parsedEvent = supportedClerkEventSchema.safeParse(evt);

  if (!parsedEvent.success) {
    logWebhookVerificationFailure();

    return NextResponse.json(
      {
        message: "Webhook error",
        error: "Invalid Clerk webhook payload",
      },
      { status: 400 },
    );
  }

  const eventType = parsedEvent.data.type;

  try {
    // CREATE USER
    if (evt.type === "user.created") {
      const parsedPayload = userCreatedPayloadSchema.safeParse(evt.data);

      if (!parsedPayload.success) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      const clerkUserData = parsedPayload.data as unknown as UserJSON;
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

      return NextResponse.json({ message: "OK" });
    }

    // UPDATE USER
    if (evt.type === "user.updated") {
      const parsedPayload = userUpdatedPayloadSchema.safeParse(evt.data);

      if (!parsedPayload.success) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      const clerkUserData = parsedPayload.data;
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
        email_addresses as unknown as UserJSON["email_addresses"],
        primary_email_address_id as UserJSON["primary_email_address_id"],
      );
      const normalizedUsername = toNonEmptyString(username);

      if (email) {
        user.email = email;
      }

      if (normalizedUsername) {
        user.username = normalizedUsername;
      }

      await connectToDatabase();
      await User.findOneAndUpdate({ clerkId: id }, user, {
        returnDocument: "after",
        strict: true,
        upsert: false,
      });

      return NextResponse.json({ message: "OK" });
    }

    // DELETE USER
    if (evt.type === "user.deleted") {
      const parsedPayload = userDeletedPayloadSchema.safeParse(evt.data);

      if (!parsedPayload.success) {
        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Invalid Clerk user payload",
          },
          { status: 400 },
        );
      }

      const { id } = parsedPayload.data;

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
      let deletedUserCount: number | null = null;
      let deletedTransactionCount: number | null = null;
      let deletedTaskCount: number | null = null;
      let deletedUsageEventCount: number | null = null;
      let deletedObjectCount: number | null = null;

      try {
        const userToDelete = await User.findOne({ clerkId });
        if (userToDelete) {
          await User.findByIdAndDelete(userToDelete._id);
          deletedUserCount = 1;
        } else {
          deletedUserCount = 0;
        }
      } catch {
        logUserDeletedCleanupFailure("user");
      }

      try {
        const deletedTransactions = await Transaction.deleteMany({ clerkId });
        deletedTransactionCount = deletedTransactions.deletedCount ?? 0;
      } catch {
        logUserDeletedCleanupFailure("transaction");
      }

      try {
        const deletedTasks = await Task.deleteMany({ userId: clerkId });
        deletedTaskCount = deletedTasks.deletedCount ?? 0;
      } catch {
        logUserDeletedCleanupFailure("task");
      }

      try {
        const deletedUsageEvents = await UsageEvent.deleteMany({
          userId: clerkId,
        });
        deletedUsageEventCount = deletedUsageEvents.deletedCount ?? 0;
      } catch {
        logUserDeletedCleanupFailure("usage-event");
      }

      try {
        deletedObjectCount = await deleteS3Prefix(`${clerkId}/`);
      } catch {
        logUserDeletedCleanupFailure("s3");
      }

      logUserDeletedCleanupSummary({
        deletedUserCount,
        deletedTransactionCount,
        deletedTaskCount,
        deletedObjectCount,
      });

      process.stderr.write(
        `[clerk-webhook] user.deleted cleanup counts usageEvents=${deletedUsageEventCount ?? "unknown"}\n`,
      );

      return NextResponse.json({ message: "OK" });
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
