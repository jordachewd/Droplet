"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { UpdateUserParams } from "@/types/UserData.d";
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils/handleError";
import serializeForClient from "../utils/serialize-for-client";

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== clerkId) throw new Error("Forbidden");

    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
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
    return serializeForClient(error);
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
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      return serializeForClient({
        message: "User does not exist!",
        status: "Error",
        source: "deleteUser",
      });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    return deletedUser ? serializeForClient(deletedUser) : null;
  } catch (error) {
    handleError({ error, source: "deleteUser" });
  }
}

// READ by id
export async function getUserById(userId: string) {
  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });

    return serializeForClient(user);
  } catch (error) {
    handleError({ error, source: "getUserById" });
  }
}
