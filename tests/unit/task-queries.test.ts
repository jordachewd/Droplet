import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
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
