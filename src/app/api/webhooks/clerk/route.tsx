import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { CreateUserParams, UpdateUserParams } from "@/types/UserData.d";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import Transaction from "@/lib/database/models/transaction.model";
import serializeForClient from "@/lib/utils/serialize-for-client";

async function createUserFromWebhook(user: CreateUserParams) {
  await connectToDatabase();
  const newUser = await User.create(user);

  return newUser ? serializeForClient(newUser) : null;
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
  const payload = await req.json();
  const body = JSON.stringify(payload);

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
  } catch (err) {
    console.error("Error verifying webhook:", err);
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

    const newUser = await createUserFromWebhook(user);

    if (!newUser) {
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
        userId: newUser._id,
        role: newUser.role,
        userImg: image_url,
      },
    });

    return NextResponse.json({ message: "OK", user: newUser });
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
      new: true,
      strict: true,
      upsert: false,
    });

    if (!updatedUser) {
      return NextResponse.json(
        {
          message: "Webhook error",
          error: "User not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // DELETE USER
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    await connectToDatabase();
    const userToDelete = await User.findOne({ clerkId: id! });
    const deletedUser = userToDelete
      ? await User.findByIdAndDelete(userToDelete._id)
      : null;
    const deletedTransactions = await Transaction.deleteMany({ clerkId: id! });

    return NextResponse.json({
      message: "OK",
      deletedUser,
      deletedTransactions,
    });
  }

  return new Response("Cellesseon | Clerk Webhook Response", { status: 200 });
}
