"use server";
import { CreateTaskInput, UpdateTaskParams } from "@/types/TaskData.d";
import { Message } from "@/types";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import serializeForClient from "@/lib/utils/serialize-for-client";
import Task from "@/lib/database/models/tasks.model";
import { auth } from "@clerk/nextjs/server";
import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import {
  isUserOwnedS3ObjectKey,
  resolveS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";
import {
  chatMessageArraySchema,
  nonEmptyStringSchema,
} from "@/lib/utils/validation-schemas";
import { z } from "zod";

const taskStatusSchema = z.enum(["active", "ended"]);
const taskEndedReasonSchema = z.enum([
  "prompt_limit_reached",
  "trial_limit_reached",
  "media_limit_reached",
  "image_limit_reached",
  "audio_limit_reached",
  "video_limit_reached",
  "daily_conversation_limit_reached",
  "conversation_storage_limit_reached",
  "billing_state_invalid",
]);
const taskEndActionSchema = z.enum([
  "start_new_conversation",
  "upgrade_plan",
  "contact_support",
]);

const createTaskSchema = z
  .object({
    usage: z.number().optional(),
    title: nonEmptyStringSchema,
    messages: chatMessageArraySchema,
    personaId: nonEmptyStringSchema.optional(),
    promptCount: z.number().optional(),
    mediaCount: z.number().optional(),
    estimatedBytes: z.number().optional(),
    status: taskStatusSchema.optional(),
    endedAt: z.date().optional(),
    endedReason: taskEndedReasonSchema.optional(),
    endAction: taskEndActionSchema.optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .passthrough();

const updateTaskSchema = z
  .object({
    messages: chatMessageArraySchema,
    usage: z.number().optional(),
    personaId: nonEmptyStringSchema.optional(),
    promptCount: z.number().optional(),
    mediaCount: z.number().optional(),
    estimatedBytes: z.number().optional(),
    status: taskStatusSchema.optional(),
    endedAt: z.date().optional(),
    endedReason: taskEndedReasonSchema.optional(),
    endAction: taskEndActionSchema.optional(),
    updatedAt: z.date().optional(),
  })
  .strict();

const incrementPromptCountSchema = z
  .object({
    taskId: nonEmptyStringSchema,
    limit: z.number().int().positive(),
  })
  .strict();

type UpdateTaskInputSchema = z.infer<typeof updateTaskSchema>;

function countUserMessages(messages: Message[]): number {
  return messages.filter((message) => message.role === "user").length;
}

function estimateMessageBytes(messages: Message[]): number {
  if (messages.length === 0) {
    return 0;
  }

  return Buffer.byteLength(JSON.stringify(messages), "utf8");
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
      const rawValues = [
        contentItem.image_url?.url,
        contentItem.audio_url,
        contentItem.video_url,
      ];

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
    const parsedTask = createTaskSchema.safeParse(task);
    if (!parsedTask.success) throw new Error("Invalid task payload.");

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const newTask = await Task.create({
      ...parsedTask.data,
      userId,
      personaId: parsedTask.data.personaId || "strategist",
      promptCount:
        typeof parsedTask.data.promptCount === "number"
          ? parsedTask.data.promptCount
          : countUserMessages(parsedTask.data.messages),
      estimatedBytes:
        typeof parsedTask.data.estimatedBytes === "number"
          ? parsedTask.data.estimatedBytes
          : estimateMessageBytes(parsedTask.data.messages),
    });

    if (!newTask) {
      throw new Error("Task creation failed!");
    }

    return serializeForClient(newTask);
  } catch (error) {
    handleError({ error, source: "createTask" });
  }
}

// UPDATE TASK
export async function updateTask(taskId: string, task: UpdateTaskParams) {
  try {
    const parsedTaskId = nonEmptyStringSchema.safeParse(taskId);
    if (!parsedTaskId.success) throw new Error("Invalid task identifier.");

    const parsedTask = updateTaskSchema.safeParse(task);
    if (!parsedTask.success) throw new Error("Invalid task update payload.");

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const updateFields = {
      ...parsedTask.data,
      updatedAt: new Date(),
    } as UpdateTaskInputSchema;
    if (typeof updateFields.estimatedBytes !== "number") {
      updateFields.estimatedBytes = estimateMessageBytes(updateFields.messages);
    }

    const incFields: Record<string, number> = {};

    if (
      typeof parsedTask.data.usage === "number" &&
      parsedTask.data.usage !== 0
    ) {
      incFields.usage = parsedTask.data.usage;
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
      { _id: parsedTaskId.data, userId },
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
    const parsedInput = incrementPromptCountSchema.safeParse({ taskId, limit });
    if (!parsedInput.success) throw new Error("Invalid prompt slot claim.");

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: parsedInput.data.taskId,
        userId,
        promptCount: { $lt: parsedInput.data.limit },
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
    const parsedTaskId = nonEmptyStringSchema.safeParse(taskId);
    if (!parsedTaskId.success) {
      return serializeForClient({
        message: "Invalid conversation identifier",
        status: 400,
        source: "deleteTask",
      });
    }

    const { userId } = await auth();
    if (!userId) {
      return serializeForClient({
        message: "Unauthorized",
        status: 401,
        source: "deleteTask",
      });
    }

    if (!isValidObjectId(parsedTaskId.data)) {
      return serializeForClient({
        message: "Invalid conversation identifier",
        status: 400,
        source: "deleteTask",
      });
    }

    await connectToDatabase();

    const taskToDelete = await Task.findOne({
      _id: parsedTaskId.data,
      userId,
    });

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

    const deletedTask = await Task.findOneAndDelete({
      _id: parsedTaskId.data,
      userId,
    });

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
