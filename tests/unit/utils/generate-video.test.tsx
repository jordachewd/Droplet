import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVideo } from "@/lib/utils/openai/generateVideo";
import type { MessageRole } from "@/types";
import { createTestTask, createTestUser } from "../test-support";

const {
  videosCreateMock,
  videosRetrieveMock,
  videosDownloadContentMock,
  handleErrorMock,
  uploadFileToAWSMock,
  generateStringMock,
  normalizePlanTierMock,
  resolveModelPolicyMock,
} = vi.hoisted(() => ({
  videosCreateMock: vi.fn(),
  videosRetrieveMock: vi.fn(),
  videosDownloadContentMock: vi.fn(),
  handleErrorMock: vi.fn(),
  uploadFileToAWSMock: vi.fn(),
  generateStringMock: vi.fn(),
  normalizePlanTierMock: vi.fn(),
  resolveModelPolicyMock: vi.fn(),
}));

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    videos: {
      create: videosCreateMock,
      retrieve: videosRetrieveMock,
      downloadContent: videosDownloadContentMock,
    },
  },
}));

vi.mock("@/lib/utils/handleError", () => ({
  handleError: handleErrorMock,
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: uploadFileToAWSMock,
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: generateStringMock,
}));

vi.mock("@/lib/utils/ai-model-policy", () => ({
  normalizePlanTier: normalizePlanTierMock,
  resolveModelPolicy: resolveModelPolicyMock,
}));

type TestPolicy = {
  model: string;
  hardBlocked: boolean;
  notes?: string;
};

function createPolicy(overrides: Partial<TestPolicy> = {}): TestPolicy {
  return {
    model: "sora-2",
    hardBlocked: false,
    ...overrides,
  };
}

function createVideoRequest(
  overrides: Partial<{
    prompt: string;
    role: MessageRole;
    taskId: string;
    userId: string;
    planName: "Lite" | "Pro" | "Premium";
  }> = {},
) {
  const task = createTestTask();
  const user = createTestUser();

  return {
    prompt: "A calm ocean sunset",
    role: "assistant" as const,
    taskId: task._id,
    userId: user.clerkId,
    planName: "Lite" as const,
    ...overrides,
  };
}

describe("generateVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    handleErrorMock.mockImplementation(({ source }: { source?: string }) => {
      throw new Error(`handled:${source ?? "unknown"}`);
    });
    generateStringMock.mockReturnValue("vid123");
    normalizePlanTierMock.mockImplementation(
      (planName?: string | null) => planName?.toLowerCase() ?? "lite",
    );
    resolveModelPolicyMock.mockReturnValue(createPolicy());
    uploadFileToAWSMock.mockResolvedValue("https://cdn.example.com/video.mp4");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates, polls, downloads, and uploads video successfully", async () => {
    const contentBuffer = Buffer.from("video-bytes");
    const request = createVideoRequest();

    videosCreateMock.mockResolvedValue({
      id: "video_1",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      id: "video_1",
      status: "completed",
    });
    videosDownloadContentMock.mockResolvedValue({
      arrayBuffer: async () => contentBuffer,
    });

    const serialized = await generateVideo(request);

    const payload = JSON.parse(String(serialized)) as {
      generatedVideo: boolean;
      model: string;
      taskData: {
        content: Array<{ type: string; text?: string; video_url?: string }>;
      };
      requestMetric: { requestType: string; model: string };
    };

    expect(videosCreateMock).toHaveBeenCalledWith({
      model: "sora-2",
      prompt: request.prompt,
      seconds: "4",
      size: "1280x720",
    });
    expect(videosRetrieveMock).toHaveBeenCalledWith("video_1");
    expect(uploadFileToAWSMock).toHaveBeenCalledWith(
      contentBuffer,
      `${request.taskId}_video_vid123.mp4`,
      "video/mp4",
      `${request.userId}/videos`,
    );
    expect(payload.generatedVideo).toBe(true);
    expect(payload.model).toBe("sora-2");
    expect(payload.taskData.content[0]).toEqual({
      type: "text",
      text: "A calm ocean sunset",
    });
    expect(payload.taskData.content[1]).toEqual({
      type: "video_url",
      video_url: "https://cdn.example.com/video.mp4",
    });
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "video",
        model: "sora-2",
      }),
    );
  });

  it("polls once when video is pending before completing", async () => {
    vi.useFakeTimers();
    const contentBuffer = Buffer.from("video-polled");
    const request = createVideoRequest({ prompt: "Time-lapse city" });

    videosCreateMock.mockResolvedValue({
      id: "video_queued_1",
      status: "queued",
    });
    videosRetrieveMock
      .mockResolvedValueOnce({
        id: "video_queued_1",
        status: "queued",
      })
      .mockResolvedValueOnce({
        id: "video_queued_1",
        status: "completed",
      });
    videosDownloadContentMock.mockResolvedValue({
      arrayBuffer: async () => contentBuffer,
    });

    const generationPromise = generateVideo(request);

    await vi.advanceTimersByTimeAsync(1_000);
    const serialized = await generationPromise;
    const payload = JSON.parse(String(serialized)) as {
      generatedVideo: boolean;
    };

    expect(videosRetrieveMock).toHaveBeenCalledTimes(2);
    expect(payload.generatedVideo).toBe(true);
  });

  it("delegates to handleError when policy hard-blocks generation", async () => {
    const request = createVideoRequest({ prompt: "blocked" });

    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        hardBlocked: true,
        notes: "Video generation blocked.",
      }),
    );

    await expect(generateVideo(request)).rejects.toThrow(
      "handled:generateVideo",
    );

    expect(videosCreateMock).not.toHaveBeenCalled();
  });

  it("delegates to handleError when video creation returns no id", async () => {
    const request = createVideoRequest({ prompt: "missing id" });

    videosCreateMock.mockResolvedValue({
      status: "queued",
    });

    await expect(generateVideo(request)).rejects.toThrow(
      "handled:generateVideo",
    );
  });

  it("delegates to handleError when retrieved video status is failed", async () => {
    const request = createVideoRequest({ prompt: "invalid prompt" });

    videosCreateMock.mockResolvedValue({
      id: "video_fail_1",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      id: "video_fail_1",
      status: "failed",
      failure_reason: "Provider rejected prompt",
    });

    await expect(generateVideo(request)).rejects.toThrow(
      "handled:generateVideo",
    );
  });

  it("delegates to handleError when downloaded video content is empty", async () => {
    const request = createVideoRequest({ prompt: "empty content" });

    videosCreateMock.mockResolvedValue({
      id: "video_empty_1",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      id: "video_empty_1",
      status: "completed",
    });
    videosDownloadContentMock.mockResolvedValue({
      arrayBuffer: async () => new Uint8Array(0),
    });

    await expect(generateVideo(request)).rejects.toThrow(
      "handled:generateVideo",
    );
  });

  it("delegates to handleError when completed payload is missing id", async () => {
    const request = createVideoRequest({
      prompt: "completed without id",
    });

    videosCreateMock.mockResolvedValue({
      id: "video_no_id",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      status: "completed",
    });

    await expect(generateVideo(request)).rejects.toThrow(
      "handled:generateVideo",
    );
  });

  it("delegates to handleError when video polling times out", async () => {
    vi.useFakeTimers();
    const request = createVideoRequest({
      prompt: "timeout prompt",
    });

    videosCreateMock.mockResolvedValue({
      id: "video_timeout",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      id: "video_timeout",
      status: "queued",
    });

    const generationPromise = generateVideo(request);
    const rejectionExpectation = expect(generationPromise).rejects.toThrow(
      "handled:generateVideo",
    );

    await vi.advanceTimersByTimeAsync(181_000);
    await rejectionExpectation;
  });
});
