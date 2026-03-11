import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { createTask, deleteTask, updateTask } from "@/lib/actions/task.actions";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

describe("createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "auth_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("uses the authenticated user id instead of any caller-supplied user id", async () => {
    vi.mocked(Task.create).mockResolvedValue({
      _id: "task_1",
      userId: "auth_user_1",
      title: "Generated title",
      messages: [],
      usage: 0,
    } as never);

    await createTask({
      userId: "spoofed_user",
      title: "Generated title",
      messages: [],
    } as never);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.create).toHaveBeenCalledWith({
      userId: "auth_user_1",
      title: "Generated title",
      messages: [],
      personaId: "strategist",
      promptCount: 0,
      estimatedBytes: 0,
    });
  });

  it("initializes promptCount and estimatedBytes from the first user message", async () => {
    vi.mocked(Task.create).mockResolvedValue({
      _id: "task_1",
    } as never);

    await createTask({
      title: "Generated title",
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "hello there" }],
        },
      ],
    });

    expect(Task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promptCount: 1,
        estimatedBytes: expect.any(Number),
      }),
    );
  });

  it("rejects unauthenticated task creation attempts", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(
      createTask({
        title: "Generated title",
        messages: [],
      }),
    ).rejects.toThrow("Unauthorized | createTask");

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Task.create).not.toHaveBeenCalled();
  });
});

describe("updateTask", () => {
  const taskId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "auth_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("increments promptCount only when a prompt increment is supplied", async () => {
    vi.mocked(Task.findOneAndUpdate).mockResolvedValue({
      _id: taskId,
    } as never);

    await updateTask(taskId, {
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "hello" }],
        },
        {
          role: "assistant",
          whois: "assistant",
          content: [{ type: "text", text: "hi" }],
        },
      ],
      usage: 9,
      promptCountIncrement: 1,
      personaId: "strategist",
    });

    expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: taskId, userId: "auth_user_1" },
      expect.objectContaining({
        $inc: {
          usage: 9,
          promptCount: 1,
        },
        $set: expect.objectContaining({
          personaId: "strategist",
          estimatedBytes: expect.any(Number),
        }),
      }),
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
  });

  it("avoids an empty $inc update when usage and prompt increments are omitted", async () => {
    vi.mocked(Task.findOneAndUpdate).mockResolvedValue({
      _id: taskId,
    } as never);

    await updateTask(taskId, {
      messages: [],
      personaId: "strategist",
      estimatedBytes: 0,
    });

    expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: taskId, userId: "auth_user_1" },
      {
        $set: expect.objectContaining({
          messages: [],
          personaId: "strategist",
          estimatedBytes: 0,
        }),
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
  });
});

describe("deleteTask", () => {
  const taskId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "auth_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("deletes a task when requested by the owner", async () => {
    vi.mocked(Task.findOneAndDelete).mockResolvedValue({
      _id: "task_1",
    } as never);

    const result = await deleteTask(taskId);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.findOneAndDelete).toHaveBeenCalledWith({
      _id: taskId,
      userId: "auth_user_1",
    });
    expect(result).toEqual(
      expect.objectContaining({
        message: "Task deleted successfully",
        status: 200,
        source: "deleteTask",
      }),
    );
  });

  it("returns not found when task does not belong to the authenticated user", async () => {
    vi.mocked(Task.findOneAndDelete).mockResolvedValue(null as never);

    const result = await deleteTask(taskId);

    expect(result).toEqual(
      expect.objectContaining({
        message: "Task not found or not owned by user",
        status: 404,
        source: "deleteTask",
      }),
    );
  });

  it("returns unauthorized when no authenticated user is present", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    const result = await deleteTask(taskId);

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Task.findOneAndDelete).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        message: "Unauthorized",
        status: 401,
        source: "deleteTask",
      }),
    );
  });

  it("returns bad request when the task id is not a valid ObjectId", async () => {
    const result = await deleteTask("task_1");

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Task.findOneAndDelete).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        message: "Invalid conversation identifier",
        status: 400,
        source: "deleteTask",
      }),
    );
  });
});
