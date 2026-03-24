import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVideo } from "@/lib/utils/openai/generateVideo";

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

    const serialized = await generateVideo({
      prompt: "A calm ocean sunset",
      role: "assistant",
      taskId: "task_video_1",
      userId: "user_video_1",
      planName: "Lite",
    });

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
      prompt: "A calm ocean sunset",
      seconds: "4",
      size: "1280x720",
    });
    expect(videosRetrieveMock).toHaveBeenCalledWith("video_1");
    expect(uploadFileToAWSMock).toHaveBeenCalledWith(
      contentBuffer,
      "task_video_1_video_vid123.mp4",
      "video/mp4",
      "user_video_1/videos",
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

    const generationPromise = generateVideo({
      prompt: "Time-lapse city",
      role: "assistant",
      taskId: "task_video_2",
      userId: "user_video_2",
      planName: "Lite",
    });

    await vi.advanceTimersByTimeAsync(1_000);
    const serialized = await generationPromise;
    const payload = JSON.parse(String(serialized)) as {
      generatedVideo: boolean;
    };

    expect(videosRetrieveMock).toHaveBeenCalledTimes(2);
    expect(payload.generatedVideo).toBe(true);
  });

  it("delegates to handleError when policy hard-blocks generation", async () => {
    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        hardBlocked: true,
        notes: "Video generation blocked.",
      }),
    );

    await expect(
      generateVideo({
        prompt: "blocked",
        role: "assistant",
        taskId: "task_video_3",
        userId: "user_video_3",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateVideo");

    expect(videosCreateMock).not.toHaveBeenCalled();
  });

  it("delegates to handleError when video creation returns no id", async () => {
    videosCreateMock.mockResolvedValue({
      status: "queued",
    });

    await expect(
      generateVideo({
        prompt: "missing id",
        role: "assistant",
        taskId: "task_video_4",
        userId: "user_video_4",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateVideo");
  });

  it("delegates to handleError when retrieved video status is failed", async () => {
    videosCreateMock.mockResolvedValue({
      id: "video_fail_1",
      status: "queued",
    });
    videosRetrieveMock.mockResolvedValue({
      id: "video_fail_1",
      status: "failed",
      failure_reason: "Provider rejected prompt",
    });

    await expect(
      generateVideo({
        prompt: "invalid prompt",
        role: "assistant",
        taskId: "task_video_5",
        userId: "user_video_5",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateVideo");
  });

  it("delegates to handleError when downloaded video content is empty", async () => {
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

    await expect(
      generateVideo({
        prompt: "empty content",
        role: "assistant",
        taskId: "task_video_6",
        userId: "user_video_6",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateVideo");
  });
});
