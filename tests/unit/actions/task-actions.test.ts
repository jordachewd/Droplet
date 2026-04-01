import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  createTask,
  deleteTask,
  incrementPromptCountIfBelowLimit,
  updateTask,
} from "@/lib/actions/task.actions";
import {
  createTestMessage,
  createTestTask,
  createTextContentItem,
  mockAuth,
} from "../test-support";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  taskCreateMock,
  taskFindOneMock,
  taskFindOneAndUpdateMock,
  taskFindOneAndDeleteMock,
  deleteFileFromAwsMock,
} = vi.hoisted(() => ({
  taskCreateMock: vi.fn(),
  taskFindOneMock: vi.fn(),
  taskFindOneAndUpdateMock: vi.fn(),
  taskFindOneAndDeleteMock: vi.fn(),
  deleteFileFromAwsMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    create: taskCreateMock,
    findOne: taskFindOneMock,
    findOneAndUpdate: taskFindOneAndUpdateMock,
    findOneAndDelete: taskFindOneAndDeleteMock,
  },
}));

vi.mock("@/lib/utils/aws/deleteFileFromAWS", () => ({
  default: deleteFileFromAwsMock,
}));

const mongooseModuleMock = {} as typeof import("mongoose");

function createMessageList() {
  return [
    createTestMessage({
      id: "msg_user_1",
      role: "user",
      whois: "user",
      content: [createTextContentItem("hello")],
    }),
    createTestMessage({
      id: "msg_assistant_1",
      role: "assistant",
      whois: "assistant",
      content: [createTextContentItem("hi")],
    }),
    createTestMessage({
      id: "msg_user_2",
      role: "user",
      whois: "user",
      content: [createTextContentItem("continue")],
    }),
  ];
}

describe("task.actions", () => {
  const validTaskId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(vi.mocked(auth), {
      userId: "user_123",
      isAuthenticated: true,
    });
    vi.mocked(connectToDatabase).mockResolvedValue(mongooseModuleMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTask", () => {
    it("creates a task for the authenticated user and derives defaults", async () => {
      taskCreateMock.mockResolvedValue({
        _id: validTaskId,
        title: "Fresh task",
        userId: "user_123",
        messages: createMessageList(),
      });

      const response = await createTask({
        title: "Fresh task",
        messages: createMessageList(),
      });

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_123",
          title: "Fresh task",
          personaId: "strategist",
          promptCount: 2,
          estimatedBytes: expect.any(Number),
        }),
      );
      expect(response).toMatchObject({
        _id: validTaskId,
        userId: "user_123",
        title: "Fresh task",
      });
    });

    it("uses provided personaId, promptCount, and estimatedBytes when present", async () => {
      taskCreateMock.mockResolvedValue(
        createTestTask({
          _id: validTaskId,
          personaId: "developer",
        }),
      );

      await createTask({
        title: "Explicit fields",
        messages: createMessageList(),
        personaId: "developer",
        promptCount: 7,
        estimatedBytes: 2048,
      });

      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          personaId: "developer",
          promptCount: 7,
          estimatedBytes: 2048,
        }),
      );
    });

    it("rejects invalid payloads", async () => {
      type InvalidCreateTaskInput = Parameters<typeof createTask>[0] & {
        unknownField: string;
      };

      await expect(
        createTask({
          title: "invalid",
          messages: [],
          unknownField: "blocked",
        } as InvalidCreateTaskInput),
      ).rejects.toThrow("Invalid task payload.");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskCreateMock).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated task creation", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(
        createTask({
          title: "unauthorized",
          messages: [],
        }),
      ).rejects.toThrow("Unauthorized");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskCreateMock).not.toHaveBeenCalled();
    });

    it("throws when database returns no created task", async () => {
      taskCreateMock.mockResolvedValue(null);

      await expect(
        createTask({
          title: "empty",
          messages: [],
        }),
      ).rejects.toThrow("Task creation failed!");
    });
  });

  describe("updateTask", () => {
    it("updates owner task and increments usage when provided", async () => {
      taskFindOneAndUpdateMock.mockResolvedValue(
        createTestTask({
          _id: validTaskId,
          usage: 11,
        }),
      );

      const response = await updateTask(validTaskId, {
        messages: createMessageList(),
        usage: 4,
        personaId: "strategist",
      });

      expect(taskFindOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: validTaskId, userId: "user_123" },
        {
          $inc: { usage: 4 },
          $set: expect.objectContaining({
            messages: createMessageList(),
            personaId: "strategist",
            estimatedBytes: expect.any(Number),
            updatedAt: expect.any(Date),
          }),
        },
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
      expect(response).toMatchObject({ _id: validTaskId });
    });

    it("avoids $inc when usage is omitted", async () => {
      taskFindOneAndUpdateMock.mockResolvedValue(
        createTestTask({ _id: validTaskId }),
      );

      await updateTask(validTaskId, {
        messages: [],
        personaId: "strategist",
        estimatedBytes: 0,
      });

      expect(taskFindOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: validTaskId, userId: "user_123" },
        {
          $set: expect.objectContaining({
            messages: [],
            personaId: "strategist",
            estimatedBytes: 0,
            updatedAt: expect.any(Date),
          }),
        },
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
    });

    it("rejects unauthorized updates", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(updateTask(validTaskId, { messages: [] })).rejects.toThrow(
        "Unauthorized",
      );

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects invalid identifiers", async () => {
      await expect(updateTask("", { messages: [] })).rejects.toThrow(
        "Invalid task identifier.",
      );

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects invalid update payloads", async () => {
      type InvalidUpdateTaskInput = Parameters<typeof updateTask>[1] & {
        injected: string;
      };

      await expect(
        updateTask(validTaskId, {
          messages: [],
          injected: "value",
        } as InvalidUpdateTaskInput),
      ).rejects.toThrow("Invalid task update payload.");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("throws when update cannot find owned task", async () => {
      taskFindOneAndUpdateMock.mockResolvedValue(null);

      await expect(updateTask(validTaskId, { messages: [] })).rejects.toThrow(
        "Task update failed!",
      );
    });
  });

  describe("incrementPromptCountIfBelowLimit", () => {
    it("claims prompt slot atomically for owner task", async () => {
      taskFindOneAndUpdateMock.mockResolvedValue(
        createTestTask({ _id: validTaskId }),
      );

      const result = await incrementPromptCountIfBelowLimit({
        taskId: validTaskId,
        limit: 5,
      });

      expect(result).toBe(true);
      expect(taskFindOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: validTaskId,
          userId: "user_123",
          promptCount: { $lt: 5 },
        },
        {
          $inc: { promptCount: 1 },
          $set: { updatedAt: expect.any(Date) },
        },
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
    });

    it("returns false when prompt count is already at limit", async () => {
      taskFindOneAndUpdateMock.mockResolvedValue(null);

      const result = await incrementPromptCountIfBelowLimit({
        taskId: validTaskId,
        limit: 5,
      });

      expect(result).toBe(false);
    });

    it("rejects unauthorized slot claims", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(
        incrementPromptCountIfBelowLimit({
          taskId: validTaskId,
          limit: 5,
        }),
      ).rejects.toThrow("Unauthorized");
    });

    it("rejects invalid slot-claim payload", async () => {
      await expect(
        incrementPromptCountIfBelowLimit({
          taskId: "",
          limit: 0,
        }),
      ).rejects.toThrow("Invalid prompt slot claim.");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(taskFindOneAndUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("enforces ownership and returns not found for non-owned tasks", async () => {
      taskFindOneMock.mockResolvedValue(null);

      const response = await deleteTask(validTaskId);

      expect(taskFindOneAndDeleteMock).not.toHaveBeenCalled();
      expect(response).toEqual(
        expect.objectContaining({
          status: 404,
          message: "Task not found or not owned by user",
          source: "deleteTask",
        }),
      );
    });

    it("returns 401 when no authenticated user is present", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      const response = await deleteTask(validTaskId);

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(response).toEqual(
        expect.objectContaining({
          status: 401,
          message: "Unauthorized",
          source: "deleteTask",
        }),
      );
    });

    it("returns 400 for invalid object ids", async () => {
      const response = await deleteTask("invalid-id");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(response).toEqual(
        expect.objectContaining({
          status: 400,
          message: "Invalid conversation identifier",
          source: "deleteTask",
        }),
      );
    });

    it("returns 404 when delete operation finds no owned document", async () => {
      taskFindOneMock.mockResolvedValue(createTestTask({ _id: validTaskId }));
      taskFindOneAndDeleteMock.mockResolvedValue(null);

      const response = await deleteTask(validTaskId);

      expect(response).toEqual(
        expect.objectContaining({
          status: 404,
          message: "Task not found or not owned by user",
          source: "deleteTask",
        }),
      );
    });

    it("deletes task and cleans only owned media assets", async () => {
      taskFindOneMock.mockResolvedValue(
        createTestTask({
          _id: validTaskId,
          messages: [
            createTestMessage({
              role: "user",
              whois: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: "/api/download?key=user_123%2Fuploads%2Fphoto.png",
                  },
                },
                {
                  type: "audio_url",
                  audio_url: "/api/download?key=user_123%2Faudio%2Fclip.mp3",
                },
                {
                  type: "video_url",
                  video_url: "/api/download?key=other_user%2Fvideo%2Fmovie.mp4",
                },
              ],
            }),
          ],
        }),
      );
      taskFindOneAndDeleteMock.mockResolvedValue(
        createTestTask({ _id: validTaskId }),
      );

      const response = await deleteTask(validTaskId);

      expect(taskFindOneMock).toHaveBeenCalledWith({
        _id: validTaskId,
        userId: "user_123",
      });
      expect(taskFindOneAndDeleteMock).toHaveBeenCalledWith({
        _id: validTaskId,
        userId: "user_123",
      });
      expect(deleteFileFromAwsMock).toHaveBeenCalledTimes(2);
      expect(deleteFileFromAwsMock).toHaveBeenNthCalledWith(
        1,
        "user_123/uploads/photo.png",
      );
      expect(deleteFileFromAwsMock).toHaveBeenNthCalledWith(
        2,
        "user_123/audio/clip.mp3",
      );
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "Task deleted successfully",
          source: "deleteTask",
        }),
      );
    });

    it("continues deletion when S3 cleanup fails and logs to stderr", async () => {
      const stderrWriteSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      taskFindOneMock.mockResolvedValue(
        createTestTask({
          _id: validTaskId,
          messages: [
            createTestMessage({
              role: "user",
              whois: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: "/api/download?key=user_123%2Fuploads%2Fphoto.png",
                  },
                },
              ],
            }),
          ],
        }),
      );
      taskFindOneAndDeleteMock.mockResolvedValue(
        createTestTask({ _id: validTaskId }),
      );
      deleteFileFromAwsMock.mockRejectedValue(new Error("S3 unavailable"));

      const response = await deleteTask(validTaskId);

      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "Task deleted successfully",
        }),
      );
      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining("[task.actions] deleteTask S3 cleanup failed:"),
      );
      stderrWriteSpy.mockRestore();
    });

    it("returns 500 response when unexpected deletion error occurs", async () => {
      taskFindOneMock.mockRejectedValue(new Error("Database unavailable"));

      const response = await deleteTask(validTaskId);

      expect(response).toEqual(
        expect.objectContaining({
          status: 500,
          message: "Conversation deletion failed.",
          source: "deleteTask",
        }),
      );
    });
  });
});
