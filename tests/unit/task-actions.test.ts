import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { createTask, deleteTask } from "@/lib/actions/task.actions";

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
    });
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
