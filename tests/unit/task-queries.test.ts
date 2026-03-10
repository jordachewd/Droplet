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
      updatedAt: new Date("2026-03-09T18:00:00.000Z"),
    });
    const select = vi.fn().mockReturnValue({ lean });

    vi.mocked(Task.findOne).mockReturnValue({ select } as never);

    const result = await getTaskByIdForUser({
      taskId: "task_1",
      userId: "user_1",
    });

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.findOne).toHaveBeenCalledWith({
      _id: "task_1",
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
      updatedAt: "2026-03-09T18:00:00.000Z",
    });
  });
});
