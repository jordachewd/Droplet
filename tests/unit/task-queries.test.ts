import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import {
  getMediaItemsByUserId,
  getRecentTasksByUserId,
  getTaskByIdForUser,
} from "@/lib/utils/task-queries";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    aggregate: vi.fn(),
  },
}));

describe("getTaskByIdForUser", () => {
  const taskId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("serializes nested mongoose subdocument ids before returning messages", async () => {
    const lean = vi.fn().mockResolvedValue({
      _id: "task_1",
      title: "Conversation",
      personaId: "strategist",
      messages: [
        {
          whois: "assistant",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Hello there",
              _id: {
                buffer: Buffer.from("subdoc-id"),
                toJSON: () => "subdoc-id",
              },
            },
          ],
        },
      ],
      usage: 3,
      promptCount: 2,
      mediaCount: 1,
      estimatedBytes: 420,
      status: "ended",
      endedAt: new Date("2026-03-09T19:00:00.000Z"),
      endedReason: "prompt_limit_reached",
      endAction: "start_new_conversation",
      updatedAt: new Date("2026-03-09T18:00:00.000Z"),
    });
    const select = vi.fn().mockReturnValue({ lean });

    vi.mocked(Task.findOne).mockReturnValue({ select } as never);

    const result = await getTaskByIdForUser({
      taskId,
      userId: "user_1",
    });

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.findOne).toHaveBeenCalledWith({
      _id: taskId,
      userId: "user_1",
    });
    expect(result).toEqual({
      _id: "task_1",
      title: "Conversation",
      personaId: "strategist",
      messages: [
        {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Hello there" }],
        },
      ],
      usage: 3,
      promptCount: 2,
      mediaCount: 1,
      estimatedBytes: 420,
      status: "ended",
      endedAt: "2026-03-09T19:00:00.000Z",
      endedReason: "prompt_limit_reached",
      endAction: "start_new_conversation",
      updatedAt: "2026-03-09T18:00:00.000Z",
    });
  });

  it("returns null without querying MongoDB when the task id is invalid", async () => {
    const result = await getTaskByIdForUser({
      taskId: "task_1",
      userId: "user_1",
    });

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Task.findOne).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe("getMediaItemsByUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("returns normalized media items from aggregation results", async () => {
    vi.mocked(Task.aggregate).mockResolvedValue([
      {
        url: "https://cdn.example.com/audio.wav",
        taskId: "task_42",
        taskTitle: "Audio task",
        personaId: "developer",
        createdAt: new Date("2026-03-16T10:00:00.000Z"),
      },
    ] as never);

    const result = await getMediaItemsByUserId("user_1", "audio_url", 12, 6);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.aggregate).toHaveBeenCalledOnce();
    expect(result).toEqual([
      {
        url: "https://cdn.example.com/audio.wav",
        taskId: "task_42",
        taskTitle: "Audio task",
        personaId: "developer",
        createdAt: "2026-03-16T10:00:00.000Z",
      },
    ]);
  });

  it("normalizes pagination bounds and filters invalid aggregate rows", async () => {
    vi.mocked(Task.aggregate).mockResolvedValue([
      {
        url: "",
        taskId: "task_1",
        taskTitle: "",
        personaId: "unknown-persona",
        createdAt: "invalid-date",
      },
    ] as never);

    const result = await getMediaItemsByUserId("user_1", "video_url", 999, -10);

    const pipeline = vi.mocked(Task.aggregate).mock
      .calls[0]?.[0] as unknown as Array<Record<string, unknown>>;
    const skipStage = pipeline.find((stage) => "$skip" in stage) as {
      $skip: number;
    };
    const limitStage = pipeline.find((stage) => "$limit" in stage) as {
      $limit: number;
    };

    expect(skipStage.$skip).toBe(0);
    expect(limitStage.$limit).toBe(100);
    expect(result).toEqual([
      {
        url: "",
        taskId: "task_1",
        taskTitle: "Untitled conversation",
        personaId: "strategist",
        createdAt: expect.any(String),
      },
    ]);
  });
});

describe("getRecentTasksByUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("applies offset and limit bounds when fetching task history", async () => {
    const lean = vi.fn().mockResolvedValue([
      {
        _id: "task_1",
        title: "First",
        personaId: "strategist",
        updatedAt: "2026-03-16T10:00:00.000Z",
      },
    ]);
    const select = vi.fn().mockReturnValue({ lean });
    const limit = vi.fn().mockReturnValue({ select });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });

    vi.mocked(Task.find).mockReturnValue({ sort } as never);

    const result = await getRecentTasksByUserId("user_1", 999, -5);

    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([
      {
        _id: "task_1",
        title: "First",
        personaId: "strategist",
        updatedAt: "2026-03-16T10:00:00.000Z",
      },
    ]);
  });
});
