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

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== clerkId) throw new Error("Forbidden");

    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      returnDocument: "after",
      strict: true,
      upsert: false,
    });

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
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== clerkId) throw new Error("Forbidden");

    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId }).select("_id").lean();

    if (!userToDelete) {
      return serializeForClient({
        message: "User does not exist!",
        status: 404,
        source: "deleteUser",
      });
    }

    const [deletedTasks, deletedTransactions] = await Promise.all([
      Task.deleteMany({ userId: clerkId }),
      Transaction.deleteMany({ clerkId }),
    ]);

    const deletedObjectsCount = await deleteS3Prefix(`${clerkId}/`);

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
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== userId) throw new Error("Forbidden");

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId })
      .select(
        "clerkId username email role plan firstName lastName userimg registerAt updatedAt",
      )
      .lean();

    return serializeForClient(user);
  } catch (error) {
    handleError({ error, source: "getUserById" });
  }
}
