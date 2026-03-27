import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import Upload from "@/lib/database/models/upload.model";
import {
  getMediaItemsByUserId,
  getRecentTasksByUserId,
  getTaskByIdForUser,
  getUploadsByUserId,
} from "@/lib/utils/task-queries";
import {
  createTestTask,
  createTestUser,
  mockMongooseModel,
} from "../test-support";

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

vi.mock("@/lib/database/models/upload.model", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock("mongoose", () => ({
  isValidObjectId: vi.fn(),
}));

type TaskModelMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
};

type UploadModelMock = {
  find: ReturnType<typeof vi.fn>;
};

const taskModelMock = Task as unknown as TaskModelMock;
const uploadModelMock = Upload as unknown as UploadModelMock;

describe("task-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recent tasks with safe pagination and fallbacks", async () => {
    const user = createTestUser();
    const task = createTestTask();
    const findQuery = mockMongooseModel([
      {
        _id: task._id,
        title: "",
        updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      },
    ]);

    taskModelMock.find.mockReturnValue(findQuery);

    const result = await getRecentTasksByUserId(user._id, 500, -42);

    expect(connectToDatabase).toHaveBeenCalledTimes(1);
    expect(taskModelMock.find).toHaveBeenCalledWith({ userId: user._id });
    expect(findQuery.skip).toHaveBeenCalledWith(0);
    expect(findQuery.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([
      expect.objectContaining({
        _id: task._id,
        title: "Untitled conversation",
      }),
    ]);
  });

  it("returns null when task id is not a valid object id", async () => {
    const user = createTestUser();
    vi.mocked(isValidObjectId).mockReturnValue(false);

    const result = await getTaskByIdForUser({
      taskId: "invalid-id",
      userId: user._id,
    });

    expect(result).toBeNull();
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(taskModelMock.findOne).not.toHaveBeenCalled();
  });

  it("returns normalized task payload for valid object ids", async () => {
    const user = createTestUser();
    const task = createTestTask();
    vi.mocked(isValidObjectId).mockReturnValue(true);

    const findOneQuery = mockMongooseModel({
      _id: task._id,
      title: task.title,
      personaId: task.personaId,
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          role: "invalid-role",
          content: "ignored",
        },
        {
          role: "assistant",
          whois: "assistant",
          content: [
            {
              type: "image_url",
              image_url: { url: "https://example.com/image.png" },
            },
            {
              type: "audio_url",
              audio_url: "https://example.com/audio.wav",
            },
            {
              type: "video_url",
              video_url: "https://example.com/video.mp4",
            },
          ],
        },
      ],
      usage: 9,
      promptCount: 4,
      mediaCount: 2,
      estimatedBytes: 888,
      status: "ended",
      endedAt: new Date("2026-03-12T00:00:00.000Z"),
      endedReason: "prompt_limit_reached",
      endAction: "start_new_conversation",
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
    });

    taskModelMock.findOne.mockReturnValue(findOneQuery);

    const result = await getTaskByIdForUser({
      taskId: task._id,
      userId: user._id,
    });

    expect(connectToDatabase).toHaveBeenCalledTimes(1);
    expect(taskModelMock.findOne).toHaveBeenCalledWith({
      _id: task._id,
      userId: user._id,
    });
    expect(result).toEqual(
      expect.objectContaining({
        _id: task._id,
        personaId: task.personaId,
        status: "ended",
        endedReason: "prompt_limit_reached",
        endAction: "start_new_conversation",
        usage: 9,
        promptCount: 4,
        mediaCount: 2,
        estimatedBytes: 888,
      }),
    );
    expect(result?.messages).toHaveLength(2);
    expect(result?.messages[0]).toEqual(
      expect.objectContaining({
        role: "user",
      }),
    );
  });

  it("returns media items with normalized persona and pagination clamps", async () => {
    const user = createTestUser();
    const task = createTestTask();

    taskModelMock.aggregate.mockResolvedValueOnce([
      {
        url: "https://example.com/private-file",
        taskId: task._id,
        taskTitle: "",
        personaId: "unknown-persona",
        createdAt: "invalid-date",
      },
    ]);

    const result = await getMediaItemsByUserId(
      user._id,
      "image_url",
      -5,
      99_999,
    );

    const pipeline = taskModelMock.aggregate.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;

    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline).toContainEqual(
      expect.objectContaining({
        $match: {
          "messages.content.type": "image_url",
        },
      }),
    );
    expect(pipeline).toContainEqual({ $skip: 10_000 });
    expect(pipeline).toContainEqual({ $limit: 1 });

    expect(result[0]).toEqual(
      expect.objectContaining({
        url: "https://example.com/private-file",
        taskId: task._id,
        taskTitle: "Untitled conversation",
        personaId: "strategist",
      }),
    );
    expect(Number.isNaN(new Date(result[0]?.createdAt ?? "").getTime())).toBe(
      false,
    );
  });

  it("returns uploaded files with pagination clamps and normalized payload", async () => {
    const user = createTestUser();
    const uploadQuery = mockMongooseModel([
      {
        _id: "upload_1",
        fileName: "",
        objectKey: "user_123/uploads/file.png",
        s3Url: "/api/download?key=user_123%2Fuploads%2Ffile.png",
        contentType: "image/png",
        sizeBytes: 2048,
        taskId: "task_123",
        createdAt: "invalid-date",
      },
    ]);
    uploadModelMock.find.mockReturnValue(uploadQuery);

    const result = await getUploadsByUserId(user._id, 1000, -10);

    expect(connectToDatabase).toHaveBeenCalledTimes(1);
    expect(uploadModelMock.find).toHaveBeenCalledWith({ userId: user._id });
    expect(uploadQuery.skip).toHaveBeenCalledWith(0);
    expect(uploadQuery.limit).toHaveBeenCalledWith(100);
    expect(uploadQuery.select).toHaveBeenCalledWith(
      "fileName objectKey s3Url contentType sizeBytes taskId createdAt",
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "upload_1",
        fileName: "Uploaded file",
        objectKey: "user_123/uploads/file.png",
        s3Url: "/api/download?key=user_123%2Fuploads%2Ffile.png",
        contentType: "image/png",
        sizeBytes: 2048,
        taskId: "task_123",
      }),
    ]);
    expect(Number.isNaN(new Date(result[0]?.createdAt ?? "").getTime())).toBe(
      false,
    );
  });
});
