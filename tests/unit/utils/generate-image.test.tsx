import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateImage } from "@/lib/utils/openai/generateImage";

const {
  imagesGenerateMock,
  handleErrorMock,
  sharpFactoryMock,
  sharpPngMock,
  sharpToBufferMock,
  uploadFileToAWSMock,
  generateStringMock,
  normalizePlanTierMock,
  resolveModelPolicyMock,
} = vi.hoisted(() => ({
  imagesGenerateMock: vi.fn(),
  handleErrorMock: vi.fn(),
  sharpFactoryMock: vi.fn(),
  sharpPngMock: vi.fn(),
  sharpToBufferMock: vi.fn(),
  uploadFileToAWSMock: vi.fn(),
  generateStringMock: vi.fn(),
  normalizePlanTierMock: vi.fn(),
  resolveModelPolicyMock: vi.fn(),
}));

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    images: {
      generate: imagesGenerateMock,
    },
  },
}));

vi.mock("@/lib/utils/handleError", () => ({
  handleError: handleErrorMock,
}));

vi.mock("sharp", () => ({
  default: sharpFactoryMock,
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
    model: "gpt-image-1-mini",
    hardBlocked: false,
    ...overrides,
  };
}

describe("generateImage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    sharpPngMock.mockReturnValue({
      toBuffer: sharpToBufferMock,
    });
    sharpFactoryMock.mockReturnValue({
      png: sharpPngMock,
    });

    handleErrorMock.mockImplementation(({ source }: { source?: string }) => {
      throw new Error(`handled:${source ?? "unknown"}`);
    });
    generateStringMock.mockReturnValue("abc123");
    normalizePlanTierMock.mockImplementation(
      (planName?: string | null) => planName?.toLowerCase() ?? "lite",
    );
    resolveModelPolicyMock.mockReturnValue(createPolicy());
    uploadFileToAWSMock.mockResolvedValue("https://cdn.example.com/image.png");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("generates and uploads a PNG image from base64 response data", async () => {
    const rawBuffer = Buffer.from("raw-image");
    const convertedBuffer = Buffer.from("converted-image");

    imagesGenerateMock.mockResolvedValue({
      data: [
        {
          b64_json: rawBuffer.toString("base64"),
          revised_prompt: "Refined prompt",
        },
      ],
    });
    sharpToBufferMock.mockResolvedValue(convertedBuffer);

    const serialized = await generateImage({
      prompt: "Original prompt",
      role: "assistant",
      taskId: "task_img_1",
      userId: "user_img_1",
      planName: "Lite",
    });

    const payload = JSON.parse(String(serialized)) as {
      taskData: {
        content: Array<{
          type: string;
          text?: string;
          image_url?: { url: string };
        }>;
      };
      generatedImage: boolean;
      model: string;
      requestMetric: { requestType: string; model: string };
    };

    expect(imagesGenerateMock).toHaveBeenCalledWith({
      model: "gpt-image-1-mini",
      prompt: "Original prompt",
    });
    expect(uploadFileToAWSMock).toHaveBeenCalledWith(
      convertedBuffer,
      "task_img_1_image_abc123.png",
      "image/png",
      "user_img_1/images",
    );
    expect(payload.generatedImage).toBe(true);
    expect(payload.model).toBe("gpt-image-1-mini");
    expect(payload.taskData.content[0]).toEqual({
      type: "text",
      text: "Refined prompt",
    });
    expect(payload.taskData.content[1]).toEqual({
      type: "image_url",
      image_url: { url: "https://cdn.example.com/image.png" },
    });
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "image",
        model: "gpt-image-1-mini",
      }),
    );
  });

  it("fetches image bytes from URL when base64 payload is unavailable", async () => {
    const fetchedBuffer = Buffer.from("downloaded-image");
    const convertedBuffer = Buffer.from("converted-from-url");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fetchedBuffer,
    }) as typeof fetch;
    imagesGenerateMock.mockResolvedValue({
      data: [{ url: "https://openai.example/image" }],
    });
    sharpToBufferMock.mockResolvedValue(convertedBuffer);

    const serialized = await generateImage({
      prompt: "URL prompt",
      role: "assistant",
      taskId: "task_img_2",
      userId: "user_img_2",
      planName: "Lite",
    });

    const payload = JSON.parse(String(serialized)) as {
      taskData: { content: Array<{ type: string; text?: string }> };
    };

    expect(global.fetch).toHaveBeenCalledWith("https://openai.example/image");
    expect(payload.taskData.content[0]).toEqual({
      type: "text",
      text: "URL prompt",
    });
  });

  it("delegates to handleError when model policy hard-blocks the request", async () => {
    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        hardBlocked: true,
        notes: "Image generation is blocked by policy.",
      }),
    );

    await expect(
      generateImage({
        prompt: "blocked",
        role: "assistant",
        taskId: "task_img_3",
        userId: "user_img_3",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateImage");

    expect(imagesGenerateMock).not.toHaveBeenCalled();
    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateImage",
      }),
    );
  });

  it("delegates to handleError when image API returns no generated data", async () => {
    imagesGenerateMock.mockResolvedValue({
      data: [],
    });

    await expect(
      generateImage({
        prompt: "empty response",
        role: "assistant",
        taskId: "task_img_4",
        userId: "user_img_4",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateImage");

    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateImage",
      }),
    );
  });

  it("delegates to handleError when image URL fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      arrayBuffer: async () => Buffer.from(""),
    }) as typeof fetch;
    imagesGenerateMock.mockResolvedValue({
      data: [{ url: "https://openai.example/fail-image" }],
    });

    await expect(
      generateImage({
        prompt: "fetch fail",
        role: "assistant",
        taskId: "task_img_5",
        userId: "user_img_5",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateImage");

    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateImage",
      }),
    );
  });

  it("delegates to handleError when response has no usable image payload", async () => {
    imagesGenerateMock.mockResolvedValue({
      data: [{}],
    });

    await expect(
      generateImage({
        prompt: "missing payload",
        role: "assistant",
        taskId: "task_img_6",
        userId: "user_img_6",
        planName: "Lite",
      }),
    ).rejects.toThrow("handled:generateImage");

    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateImage",
      }),
    );
  });
});
