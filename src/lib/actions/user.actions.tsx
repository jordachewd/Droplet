"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { UpdateUserParams } from "@/types/UserData.d";
import User from "@/lib/database/models/user.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
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
    videoGenerations: z.number().optional(),
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

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId: parsedClerkId.data })
      .select("_id")
      .lean();

    if (!userToDelete) {
      return serializeForClient({
        message: "User does not exist!",
        status: 404,
        source: "deleteUser",
      });
    }

    const [deletedTasks, deletedTransactions] = await Promise.all([
      Task.deleteMany({ userId: parsedClerkId.data }),
      Transaction.deleteMany({ clerkId: parsedClerkId.data }),
    ]);

    const deletedObjectsCount = await deleteS3Prefix(`${parsedClerkId.data}/`);

    // Delete user after all user-owned data and assets are cleaned up
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
      deletedTasks: deletedTasks.deletedCount ?? 0,
      deletedTransactions: deletedTransactions.deletedCount ?? 0,
      deletedObjectsCount,
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
        "clerkId username email role plan firstName lastName userimg registerAt updatedAt",
      )
      .lean();

    return serializeForClient(user);
  } catch (error) {
    handleError({ error, source: "getUserById" });
  }
}
