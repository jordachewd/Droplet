import { DEFAULT_ASSISTANT_ROLE_ID } from "@/constants/assistant-roles";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { TaskHistoryItem } from "@/types/TaskData.d";
import { Message } from "@/types";

type TaskRecord = {
  _id: unknown;
  title?: string;
  assistantRoleId?: string;
  usage?: number;
  updatedAt?: Date | string;
  messages?: unknown;
};

export async function getRecentTasksByUserId(
  userId: string,
  limit: number = 8,
): Promise<TaskHistoryItem[]> {
  await connectToDatabase();

  const tasks = (await Task.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("_id title assistantRoleId usage updatedAt")
    .lean()) as TaskRecord[];

  return tasks.map((task) => ({
    _id: String(task._id),
    title: task.title || "Untitled conversation",
    assistantRoleId:
      (task.assistantRoleId as TaskHistoryItem["assistantRoleId"]) ||
      DEFAULT_ASSISTANT_ROLE_ID,
    usage: typeof task.usage === "number" ? task.usage : 0,
    updatedAt: new Date(task.updatedAt || Date.now()).toISOString(),
  }));
}

export async function getTaskByIdForUser({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  await connectToDatabase();

  const task = await Task.findOne({ _id: taskId, userId })
    .select("_id title assistantRoleId messages usage updatedAt")
    .lean();

  if (!task) {
    return null;
  }

  return {
    _id: String(task._id),
    title: String(task.title || "Untitled conversation"),
    assistantRoleId:
      String(task.assistantRoleId || DEFAULT_ASSISTANT_ROLE_ID) ||
      DEFAULT_ASSISTANT_ROLE_ID,
    messages: Array.isArray(task.messages) ? (task.messages as Message[]) : [],
    usage: typeof task.usage === "number" ? task.usage : 0,
    updatedAt: new Date(task.updatedAt || Date.now()).toISOString(),
  };
}
