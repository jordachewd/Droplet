import { DEFAULT_ASSISTANT_ROLE_ID } from "@/constants/assistant-roles";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { TaskHistoryItem } from "@/types/TaskData.d";
import { ContentItem, Message, MessageRole } from "@/types";

type TaskRecord = {
  _id: unknown;
  title?: string;
  assistantRoleId?: string;
  usage?: number;
  updatedAt?: Date | string;
  messages?: unknown;
};

const messageRoles: MessageRole[] = [
  "user",
  "assistant",
  "system",
  "developer",
];

function isMessageRole(value: unknown): value is MessageRole {
  return (
    typeof value === "string" && messageRoles.includes(value as MessageRole)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPlainContent(content: unknown): Message["content"] {
  if (typeof content === "string" || content === null) {
    return content;
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content.reduce<ContentItem[]>((items, entry) => {
    if (!isRecord(entry)) {
      return items;
    }

    const { type, text, image_url, audio_url } = entry;

    if (
      type !== "text" &&
      type !== "temp" &&
      type !== "image_url" &&
      type !== "audio_url"
    ) {
      return items;
    }

    const item: ContentItem = { type };

    if (typeof text === "string" || text === null) {
      item.text = text;
    }

    if (
      isRecord(image_url) &&
      (typeof image_url.url === "string" || image_url.url === null)
    ) {
      item.image_url = { url: image_url.url };
    }

    if (typeof audio_url === "string" || audio_url === null) {
      item.audio_url = audio_url;
    }

    items.push(item);
    return items;
  }, []);
}

function toPlainMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.reduce<Message[]>((items, entry) => {
    if (!isRecord(entry) || !isMessageRole(entry.role)) {
      return items;
    }

    const message: Message = {
      role: entry.role,
      content: toPlainContent(entry.content),
    };

    if (isMessageRole(entry.whois)) {
      message.whois = entry.whois;
    }

    items.push(message);
    return items;
  }, []);
}

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
    messages: toPlainMessages(task.messages),
    usage: typeof task.usage === "number" ? task.usage : 0,
    updatedAt: new Date(task.updatedAt || Date.now()).toISOString(),
  };
}
