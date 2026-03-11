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

async function createUserFromWebhook(user: CreateUserParams) {
  await connectToDatabase();
  const newUser = await User.create(user);

  return newUser ? serializeForClient(newUser) : null;
}

async function findUserByClerkId(clerkId: string) {
  await connectToDatabase();

  const existingUser = await User.findOne({ clerkId });
  return existingUser ? serializeForClient(existingUser) : null;
}

function logUserDeletedCleanupFailure(step: string) {
  process.stderr.write(
    `[clerk-webhook] user.deleted ${step} cleanup failed.\n`,
  );
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

  // CREATE USER
  if (eventType === "user.created") {
    const {
      id,
      email_addresses,
      created_at,
      first_name,
      last_name,
      username,
      image_url,
    } = evt.data;

    const user: CreateUserParams = {
      clerkId: id,
      userimg: image_url,
      username: username!,
      email: email_addresses[0].email_address,
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      registerAt: new Date(created_at),
    };

    const existingUser = await findUserByClerkId(id);
    const syncedUser = existingUser ?? (await createUserFromWebhook(user));

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
        userImg: image_url,
      },
    });

    return NextResponse.json({ message: "OK", user: syncedUser });
  }

  // UPDATE USER
  if (eventType === "user.updated") {
    const { id, updated_at, first_name, last_name, image_url } = evt.data;

    const user: UpdateUserParams = {
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      updatedAt: new Date(updated_at),
      userimg: image_url,
    };

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
    const { id } = evt.data;

    await connectToDatabase();
    const clerkId = id!;
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

  return new Response("Droplet | Clerk Webhook Response", { status: 200 });
}
