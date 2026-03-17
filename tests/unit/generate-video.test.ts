import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVideo } from "@/lib/utils/openai/generateVideo";
import { openAiClient } from "@/constants/openai";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import * as modelPolicy from "@/lib/utils/ai-model-policy";

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    videos: {
      create: vi.fn(),
      retrieve: vi.fn(),
      downloadContent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: vi.fn(),
}));

describe("generateVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateString).mockReturnValue("fixedtoken");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "/api/download?key=user_123%2Fvideos%2Ftask_1_video_fixedtoken.mp4" as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates, polls, downloads, and uploads generated video", async () => {
    vi.mocked(openAiClient.videos.create).mockResolvedValue({
      id: "video_123",
      status: "queued",
    } as never);
    vi.mocked(openAiClient.videos.retrieve).mockResolvedValue({
      id: "video_123",
      status: "completed",
    } as never);
    vi.mocked(openAiClient.videos.downloadContent).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("video-bytes").buffer),
    } as never);

    const result = await generateVideo({
      prompt: "A sunrise over the ocean",
      role: "assistant",
      taskId: "task_1",
      userId: "user_123",
      planName: "Pro",
    });

    expect(openAiClient.videos.create).toHaveBeenCalledWith({
      model: "sora-2",
      prompt: "A sunrise over the ocean",
      seconds: "4",
      size: "1280x720",
    });
    expect(openAiClient.videos.retrieve).toHaveBeenCalledWith("video_123");
    expect(openAiClient.videos.downloadContent).toHaveBeenCalledWith(
      "video_123",
    );
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      "task_1_video_fixedtoken.mp4",
      "video/mp4",
      "user_123/videos",
    );

    const payload = JSON.parse(result as string);

    expect(payload.generatedVideo).toBe(true);
    expect(payload.model).toBe("sora-2");
    expect(payload.taskData.content[1]).toEqual({
      type: "video_url",
      video_url:
        "/api/download?key=user_123%2Fvideos%2Ftask_1_video_fixedtoken.mp4",
    });
  });

  it("throws when video retrieval returns failed status", async () => {
    vi.mocked(openAiClient.videos.create).mockResolvedValue({
      id: "video_456",
      status: "queued",
    } as never);
    vi.mocked(openAiClient.videos.retrieve).mockResolvedValue({
      id: "video_456",
      status: "failed",
      failure_reason: "Prompt rejected by video safety policy",
    } as never);

    await expect(
      generateVideo({
        prompt: "unsafe prompt",
        role: "assistant",
        taskId: "task_2",
        userId: "user_123",
        planName: "Pro",
      }),
    ).rejects.toThrow("Prompt rejected by video safety policy | generateVideo");
  });

  it("throws when polling exceeds timeout", async () => {
    vi.mocked(openAiClient.videos.create).mockResolvedValue({
      id: "video_789",
      status: "queued",
    } as never);

    let nowCallCount = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      nowCallCount += 1;

      if (nowCallCount <= 2) {
        return 0;
      }

      return 180_001;
    });

    await expect(
      generateVideo({
        prompt: "timeout case",
        role: "assistant",
        taskId: "task_3",
        userId: "user_123",
        planName: "Pro",
      }),
    ).rejects.toThrow("Video generation timed out. Please try again.");

    expect(openAiClient.videos.retrieve).not.toHaveBeenCalled();
  });

  it("throws when policy hard-blocks video generation", async () => {
    vi.spyOn(modelPolicy, "resolveModelPolicy").mockReturnValue({
      model: "sora-2",
      fallbackModel: "sora-2",
      isTtsOnly: false,
      feature: "video_generation",
      plan: "pro",
      taskClass: "final",
      wasDowngraded: false,
      downgradeReasons: [],
      hardBlocked: true,
      notes: "Video generation is disabled by policy.",
    });

    await expect(
      generateVideo({
        prompt: "blocked",
        role: "assistant",
        taskId: "task_4",
        userId: "user_123",
        planName: "Pro",
      }),
    ).rejects.toThrow(
      "Video generation is disabled by policy. | generateVideo",
    );

    expect(openAiClient.videos.create).not.toHaveBeenCalled();
  });

  it("throws when downloaded video content is empty", async () => {
    vi.mocked(openAiClient.videos.create).mockResolvedValue({
      id: "video_empty",
      status: "queued",
    } as never);
    vi.mocked(openAiClient.videos.retrieve).mockResolvedValue({
      id: "video_empty",
      status: "completed",
    } as never);
    vi.mocked(openAiClient.videos.downloadContent).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as never);

    await expect(
      generateVideo({
        prompt: "empty bytes",
        role: "assistant",
        taskId: "task_5",
        userId: "user_123",
        planName: "Pro",
      }),
    ).rejects.toThrow(
      "Video Generator API returned empty content. | generateVideo",
    );
  });
});
