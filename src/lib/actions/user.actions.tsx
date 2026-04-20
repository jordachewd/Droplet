"use server";
import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { UpdateUserParams } from "@/types/UserData.d";
import User from "@/lib/database/models/user.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { z } from "zod";

const billingCycleSchema = z.enum(["Monthly", "Yearly"]);
const planNameSchema = z.enum(["Lite", "Pro", "Premium"]);

const updateUserPlanSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    name: planNameSchema.optional(),
    amount: z.number().optional(),
    billing: billingCycleSchema.optional(),
    startedOn: z.date().optional(),
    expiresOn: z.date().optional(),
    stripeId: z.string().optional(),
    imageGenerations: z.number().optional(),
    audioGenerations: z.number().optional(),
    usagePeriodStart: z.date().optional(),
  })
  .strict();

const updateUserSchema = z
  .object({
    username: z.string().optional(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userimg: z.string().optional(),
    updatedAt: z.date().optional(),
    plan: updateUserPlanSchema.optional(),
  })
  .strict();

type UpdateUserInput = z.infer<typeof updateUserSchema>;

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    const parsedClerkId = nonEmptyStringSchema.safeParse(clerkId);
    if (!parsedClerkId.success) throw new Error("Invalid user identifier.");

    const parsedUser = updateUserSchema.safeParse(user);
    if (!parsedUser.success) throw new Error("Invalid user payload.");

    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== parsedClerkId.data) throw new Error("Forbidden");

    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: parsedClerkId.data },
      parsedUser.data as UpdateUserInput,
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!updatedUser) {
      return serializeForClient({
        message: "User update failed!",
        status: 404,
        source: "updateUser",
      });
    }

    type ClerkUsersApi = Awaited<ReturnType<typeof clerkClient>>["users"];
    type ClerkUpdateUserParams = Parameters<ClerkUsersApi["updateUser"]>[1];
    const clerkSyncPayload: Record<string, string> = {};

    if (typeof parsedUser.data.userimg === "string") {
      clerkSyncPayload.imageUrl = parsedUser.data.userimg;
    }
    if (typeof parsedUser.data.firstName === "string") {
      clerkSyncPayload.firstName = parsedUser.data.firstName;
    }
    if (typeof parsedUser.data.lastName === "string") {
      clerkSyncPayload.lastName = parsedUser.data.lastName;
    }

    const client = await clerkClient();

    if (Object.keys(clerkSyncPayload).length > 0) {
      try {
        await client.users.updateUser(
          parsedClerkId.data,
          clerkSyncPayload as unknown as ClerkUpdateUserParams,
        );
      } catch (error) {
        process.stderr.write(
          `[user.actions] updateUser Clerk profile sync failed for ${parsedClerkId.data}: ${error instanceof Error ? error.message : "unknown"}\n`,
        );
      }
    }

    if (typeof parsedUser.data.email === "string") {
      try {
        await client.emailAddresses.createEmailAddress({
          userId: parsedClerkId.data,
          emailAddress: parsedUser.data.email,
          verified: true,
          primary: true,
        });
      } catch (error) {
        process.stderr.write(
          `[user.actions] updateUser Clerk email sync failed for ${parsedClerkId.data}: ${error instanceof Error ? error.message : "unknown"}\n`,
        );
      }
    }

    return serializeForClient({
      mongoResponse: updatedUser,
      message: "User updated successfully (user.actions.tsx)",
      status: 200,
    });
  } catch (error) {
    handleError({ error, source: "updateUser" });
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    const parsedClerkId = nonEmptyStringSchema.safeParse(clerkId);
    if (!parsedClerkId.success) throw new Error("Invalid user identifier.");

    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== parsedClerkId.data) throw new Error("Forbidden");

    await connectToDatabase();

    const userToDelete = await User.findOne({ clerkId: parsedClerkId.data })
      .select("_id role")
      .lean();

    if (!userToDelete) {
      return serializeForClient({
        message: "User does not exist!",
        status: 404,
        source: "deleteUser",
      });
    }

    if (userToDelete.role === "admin") {
      return serializeForClient({
        message: "Admin accounts cannot be deleted.",
        status: 403,
        source: "deleteUser",
      });
    }

    try {
      const client = await clerkClient();
      await client.users.deleteUser(parsedClerkId.data);
    } catch (error) {
      process.stderr.write(
        `[user.actions] deleteUser Clerk deletion failed: ${error instanceof Error ? error.message : "unknown"}\n`,
      );
      return serializeForClient({
        message: "Account deletion failed. Please try again.",
        status: 500,
        source: "deleteUser",
      });
    }

    const cascadeResult = await deleteUserCascade(parsedClerkId.data);

    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    if (!deletedUser) {
      return serializeForClient({
        message: "User deletion failed!",
        status: 404,
        source: "deleteUser",
      });
    }

    revalidatePath("/");
    revalidatePath("/app");
    revalidatePath("/app/profile");
    revalidatePath("/app/library");

    return serializeForClient({
      message: "User deleted successfully.",
      status: 200,
      deletedTasks: cascadeResult.deletedTasks ?? 0,
      deletedTransactions: cascadeResult.deletedTransactions ?? 0,
      deletedUsageEvents: cascadeResult.deletedUsageEvents ?? 0,
      deletedRateLimitEntries: cascadeResult.deletedRateLimitEntries ?? 0,
      deletedUploads: cascadeResult.deletedUploads ?? 0,
      deletedObjectsCount: cascadeResult.deletedObjectsCount ?? 0,
    });
  } catch (error) {
    handleError({ error, source: "deleteUser" });
  }
}

// READ by id
export async function getUserById(userId: string) {
  try {
    const parsedUserId = nonEmptyStringSchema.safeParse(userId);
    if (!parsedUserId.success) throw new Error("Invalid user identifier.");

    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== parsedUserId.data) throw new Error("Forbidden");

    await connectToDatabase();

    const user = await User.findOne({ clerkId: parsedUserId.data })
      .select(
        "clerkId username email role suspended plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart",
      )
      .lean();

    return serializeForClient(user);
  } catch (error) {
    handleError({ error, source: "getUserById" });
  }
}
