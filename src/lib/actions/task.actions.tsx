"use server";
import { CreateTaskInput, UpdateTaskParams } from "@/types/TaskData.d";
import { Message } from "@/types";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import serializeForClient from "@/lib/utils/serialize-for-client";
import Task from "@/lib/database/models/tasks.model";
import User from "@/lib/database/models/user.model";
import { auth } from "@clerk/nextjs/server";
import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import {
  isUserOwnedS3ObjectKey,
  resolveS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";

function countUserMessages(messages: Message[]): number {
  return messages.filter((message) => message.role === "user").length;
}

function estimateMessageBytes(messages: Message[]): number {
  if (messages.length === 0) {
    return 0;
  }

  return Buffer.byteLength(JSON.stringify(messages), "utf8");
}

function getUtcStartOfDay(now: Date = new Date()): Date {
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  return startOfDay;
}

async function incrementDailyConversationCounter(
  userId: string,
): Promise<void> {
  const startOfDay = getUtcStartOfDay();
  const updatedAt = new Date();

  const updatedCounter = await User.findOneAndUpdate(
    {
      clerkId: userId,
      $or: [
        { dailyConversationWindowStart: { $gte: startOfDay } },
        { dailyConversationWindowStart: { $exists: false } },
        { dailyConversationWindowStart: null },
      ],
    },
    {
      $inc: {
        dailyConversationsStarted: 1,
      },
      $set: {
        dailyConversationWindowStart: startOfDay,
        updatedAt,
      },
    },
    {
      strict: true,
      upsert: false,
      returnDocument: "after",
    },
  );

  if (updatedCounter) {
    return;
  }

  const resetCounter = await User.findOneAndUpdate(
    { clerkId: userId },
    {
      $set: {
        dailyConversationsStarted: 1,
        dailyConversationWindowStart: startOfDay,
        updatedAt,
      },
    },
    {
      strict: true,
      upsert: false,
      returnDocument: "after",
    },
  );

  if (!resetCounter) {
    throw new Error("Daily conversation counter update failed.");
  }
}

function collectOwnedTaskAssetObjectKeys(
  messages: Message[],
  userId: string,
): string[] {
  const objectKeys = new Set<string>();

  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }

    for (const contentItem of message.content) {
      const rawValues = [contentItem.image_url?.url, contentItem.audio_url];

      for (const rawValue of rawValues) {
        if (!rawValue) {
          continue;
        }

        const objectKey = resolveS3ObjectKey(rawValue);

        if (objectKey && isUserOwnedS3ObjectKey(userId, objectKey)) {
          objectKeys.add(objectKey);
        }
      }
    }
  }

  return [...objectKeys];
}

function logTaskAssetCleanupFailure() {
  process.stderr.write("[task.actions] deleteTask S3 cleanup failed.\n");
}

// CREATE TASK
export async function createTask(task: CreateTaskInput) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const newTask = await Task.create({
      ...task,
      userId,
      personaId: task.personaId || "strategist",
      promptCount:
        typeof task.promptCount === "number"
          ? task.promptCount
          : countUserMessages(task.messages),
      estimatedBytes:
        typeof task.estimatedBytes === "number"
          ? task.estimatedBytes
          : estimateMessageBytes(task.messages),
    });

    if (!newTask) {
      throw new Error("Task creation failed!");
    }

    try {
      await incrementDailyConversationCounter(userId);
    } catch (counterError) {
      await Task.findOneAndDelete({ _id: newTask._id, userId });

      throw new Error("Task counter update failed.", {
        cause: counterError,
      });
    }

    return serializeForClient(newTask);
  } catch (error) {
    handleError({ error, source: "createTask" });
  }
}

// UPDATE TASK
export async function updateTask(taskId: string, task: UpdateTaskParams) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const updateFields = { ...task, updatedAt: new Date() };
    if (typeof updateFields.estimatedBytes !== "number") {
      updateFields.estimatedBytes = estimateMessageBytes(updateFields.messages);
    }

    const incFields: Record<string, number> = {};

    if (typeof task.usage === "number" && task.usage !== 0) {
      incFields.usage = task.usage;
    }

    delete updateFields.usage;

    const updateDocument =
      Object.keys(incFields).length > 0
        ? {
            $inc: incFields,
            $set: updateFields,
          }
        : {
            $set: updateFields,
          };

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      updateDocument,
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!updatedTask) {
      throw new Error("Task update failed!");
    }

    return serializeForClient(updatedTask);
  } catch (error) {
    handleError({ error, source: "updateTask" });
  }
}

// ATOMIC PROMPT SLOT CLAIM
export async function incrementPromptCountIfBelowLimit({
  taskId,
  limit,
}: {
  taskId: string;
  limit: number;
}): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: taskId,
        userId,
        promptCount: { $lt: limit },
      },
      {
        $inc: { promptCount: 1 },
        $set: { updatedAt: new Date() },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    return Boolean(updatedTask);
  } catch (error) {
    handleError({ error, source: "incrementPromptCountIfBelowLimit" });
    return false;
  }
}

// DELETE TASK
export async function deleteTask(taskId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return serializeForClient({
        message: "Unauthorized",
        status: 401,
        source: "deleteTask",
      });
    }

    if (!isValidObjectId(taskId)) {
      return serializeForClient({
        message: "Invalid conversation identifier",
        status: 400,
        source: "deleteTask",
      });
    }

    await connectToDatabase();

    const taskToDelete = await Task.findOne({ _id: taskId, userId });

    if (!taskToDelete) {
      return serializeForClient({
        message: "Task not found or not owned by user",
        status: 404,
        source: "deleteTask",
      });
    }

    const ownedAssetObjectKeys = collectOwnedTaskAssetObjectKeys(
      taskToDelete.messages ?? [],
      userId,
    );

    const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId });

    if (!deletedTask) {
      return serializeForClient({
        message: "Task not found or not owned by user",
        status: 404,
        source: "deleteTask",
      });
    }

    for (const objectKey of ownedAssetObjectKeys) {
      try {
        await deleteFileFromAWS(objectKey);
      } catch {
        logTaskAssetCleanupFailure();
      }
    }

    return serializeForClient({
      message: "Task deleted successfully",
      status: 200,
      source: "deleteTask",
    });
  } catch {
    return serializeForClient({
      message: "Conversation deletion failed.",
      status: 500,
      source: "deleteTask",
    });
  }
}
