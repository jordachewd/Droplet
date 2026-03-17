import { DEFAULT_PERSONA_ID, getPersona } from "@/constants/assistant-personas";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import {
  TaskConversation,
  TaskEndAction,
  TaskEndedReason,
  TaskHistoryItem,
  TaskStatus,
} from "@/types/TaskData.d";
import { ContentItem, Message, MessageRole } from "@/types";
import { PersonaId } from "@/types/PersonaData.d";
import { isValidObjectId } from "mongoose";

type TaskRecord = {
  _id: unknown;
  title?: string;
  personaId?: string;
  updatedAt?: Date | string;
  messages?: unknown;
  usage?: number;
  promptCount?: number;
  mediaCount?: number;
  estimatedBytes?: number;
  status?: TaskStatus;
  endedAt?: Date | string;
  endedReason?: TaskEndedReason;
  endAction?: TaskEndAction;
};

export type MediaContentType = "image_url" | "audio_url" | "video_url";

export interface MediaLibraryItem {
  url: string;
  taskId: string;
  taskTitle: string;
  personaId: PersonaId;
  createdAt: string;
}

type MediaAggregateRecord = {
  url?: string;
  taskId?: unknown;
  taskTitle?: string;
  personaId?: string;
  createdAt?: Date | string;
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

    const { type, text, image_url, audio_url, video_url } = entry;

    if (
      type !== "text" &&
      type !== "temp" &&
      type !== "image_url" &&
      type !== "audio_url" &&
      type !== "video_url"
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

    if (typeof video_url === "string" || video_url === null) {
      item.video_url = video_url;
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
  offset: number = 0,
): Promise<TaskHistoryItem[]> {
  await connectToDatabase();

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  const tasks = (await Task.find({ userId })
    .sort({ updatedAt: -1 })
    .skip(safeOffset)
    .limit(safeLimit)
    .select("_id title personaId updatedAt")
    .lean()) as TaskRecord[];

  return tasks.map((task) => ({
    _id: String(task._id),
    title: task.title || "Untitled conversation",
    personaId:
      (task.personaId as TaskHistoryItem["personaId"]) || DEFAULT_PERSONA_ID,
    updatedAt: new Date(task.updatedAt || Date.now()).toISOString(),
  }));
}

export async function getTaskByIdForUser({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}): Promise<TaskConversation | null> {
  if (!isValidObjectId(taskId)) {
    return null;
  }

  await connectToDatabase();

  const task = await Task.findOne({ _id: taskId, userId })
    .select(
      "_id title personaId messages usage promptCount mediaCount estimatedBytes status endedAt endedReason endAction updatedAt",
    )
    .lean();

  if (!task) {
    return null;
  }

  const personaId = String(task.personaId || DEFAULT_PERSONA_ID) as PersonaId;

  return {
    _id: String(task._id),
    title: String(task.title || "Untitled conversation"),
    personaId,
    messages: toPlainMessages(task.messages),
    usage: typeof task.usage === "number" ? task.usage : 0,
    promptCount: typeof task.promptCount === "number" ? task.promptCount : 0,
    mediaCount: typeof task.mediaCount === "number" ? task.mediaCount : 0,
    estimatedBytes:
      typeof task.estimatedBytes === "number" ? task.estimatedBytes : 0,
    status: task.status === "ended" ? "ended" : "active",
    endedAt: task.endedAt ? new Date(task.endedAt).toISOString() : undefined,
    endedReason: task.endedReason,
    endAction: task.endAction,
    updatedAt: new Date(task.updatedAt || Date.now()).toISOString(),
  };
}

export async function getMediaItemsByUserId(
  userId: string,
  mediaType: MediaContentType,
  limit: number = 24,
  offset: number = 0,
): Promise<MediaLibraryItem[]> {
  await connectToDatabase();

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  const projectUrlExpression: Record<MediaContentType, string> = {
    image_url: "$messages.content.image_url.url",
    audio_url: "$messages.content.audio_url",
    video_url: "$messages.content.video_url",
  };

  const mediaItems = (await Task.aggregate([
    {
      $match: {
        userId,
      },
    },
    {
      $unwind: "$messages",
    },
    {
      $unwind: "$messages.content",
    },
    {
      $match: {
        "messages.content.type": mediaType,
      },
    },
    {
      $project: {
        _id: 0,
        taskId: "$_id",
        taskTitle: "$title",
        personaId: "$personaId",
        createdAt: {
          $ifNull: ["$updatedAt", "$createdAt"],
        },
        url: projectUrlExpression[mediaType],
      },
    },
    {
      $match: {
        url: {
          $type: "string",
          $ne: "",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: safeOffset,
    },
    {
      $limit: safeLimit,
    },
  ])) as MediaAggregateRecord[];

  return mediaItems.map((item) => ({
    // Aggregation may return malformed dates from legacy rows; normalize safely.
    createdAt: (() => {
      const parsed = new Date(item.createdAt || Date.now());
      return Number.isNaN(parsed.getTime())
        ? new Date().toISOString()
        : parsed.toISOString();
    })(),
    url: item.url ?? "",
    taskId: String(item.taskId ?? ""),
    taskTitle: item.taskTitle || "Untitled conversation",
    personaId: getPersona(item.personaId).id,
  }));
}
