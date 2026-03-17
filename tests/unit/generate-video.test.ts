import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateVideo } from "@/lib/utils/openai/generateVideo";
import { openAiClient } from "@/constants/openai";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";

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
});
