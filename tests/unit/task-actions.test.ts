import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { createTask } from "@/lib/actions/task.actions";

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
      assistantRoleId: "strategist",
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
