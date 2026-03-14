import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { generateStreamingResponse } from "@/lib/utils/openai/generateResponse";
import { openAiClient } from "@/constants/openai";
import { generateImage } from "@/lib/utils/openai/generateImage";
import { PersonaId } from "@/types/PersonaData.d";

const streamRunner = {
  on: vi.fn(),
  finalChatCompletion: vi.fn(),
  totalUsage: vi.fn(),
};

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    chat: {
      completions: {
        create: vi.fn(),
        stream: vi.fn(() => streamRunner),
      },
    },
  },
  getChatTools: vi.fn(() => []),
}));

vi.mock("@/lib/utils/openai/generateImage", () => ({
  generateImage: vi.fn(),
}));

function createApiError(status: number): APIError {
  return Object.assign(Object.create(APIError.prototype), {
    status,
  }) as APIError;
}

const defaultEntitlements = {
  planName: "Pro" as const,
  allowedPersonaIds: [
    "strategist",
    "teacher",
    "developer",
    "creator",
  ] as PersonaId[],
  supportsImageGeneration: true,
  supportsAudioGeneration: true,
  supportsVideoGeneration: true,
  imageLimitReached: false,
  audioLimitReached: false,
  videoLimitReached: false,
};

describe("generateStreamingResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamRunner.on.mockImplementation(
      (
        eventName: string,
        callback: (delta: string, snapshot: string) => void,
      ) => {
        if (eventName === "content") {
          callback("Hello", "Hello");
        }

        return streamRunner;
      },
    );
    streamRunner.finalChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from the stream.",
          },
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 4,
        total_tokens: 13,
      },
    });
    streamRunner.totalUsage.mockResolvedValue({
      prompt_tokens: 9,
      completion_tokens: 4,
      total_tokens: 13,
    });
  });

  it("emits streamed content chunks and resolves the final payload", async () => {
    const onContentChunk = vi.fn();

    const payload = await generateStreamingResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      taskId: "task_stream",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
      onContentChunk,
    });

    expect(openAiClient.chat.completions.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1",
        max_completion_tokens: 1_100,
      }),
      {
        maxRetries: 0,
        signal: undefined,
      },
    );
    expect(onContentChunk).toHaveBeenCalledWith("Hello", "Hello");
    expect(payload.taskData?.content).toEqual([
      { type: "text", text: "Hello from the stream." },
    ]);
    expect(payload.taskUsage).toBe(13);
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestType: "chat",
          model: "gpt-4.1",
          tokensIn: 9,
          tokensOut: 4,
        }),
      ]),
    );
  });

  it("returns a stream error payload when OpenAI fails after partial content is emitted", async () => {
    const onContentChunk = vi.fn();

    streamRunner.finalChatCompletion.mockRejectedValue(createApiError(503));

    const payload = await generateStreamingResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Continue" }],
        },
      ],
      taskId: "task_stream_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
      onContentChunk,
    });

    expect(onContentChunk).toHaveBeenCalledWith("Hello", "Hello");
    expect(payload.errorType).toBe("service_error");
  });

  it("routes tool calls after the stream completes", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      JSON.stringify({
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [
            { type: "text", text: "A generated image prompt" },
            {
              type: "image_url",
              image_url: { url: "https://example.com/generated.png" },
            },
          ],
        },
        generatedImage: true,
        requestMetric: {
          requestType: "image",
          model: "gpt-image-1.5",
          latencyMs: 12,
        },
      }),
    );
    streamRunner.on.mockImplementation(() => streamRunner);
    streamRunner.finalChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedImage",
                  arguments: JSON.stringify({
                    prompt: "Create an image of a glass droplet.",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 6,
        total_tokens: 18,
      },
    });

    const payload = await generateStreamingResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image." }],
        },
      ],
      taskId: "task_stream_tool",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Create an image of a glass droplet.",
        taskId: "task_stream_tool",
        userId: "clerk_1",
        planName: "Pro",
      }),
    );
    expect(payload.generatedImage).toBe(true);
    expect(payload.taskData?.content).toEqual([
      { type: "text", text: "A generated image prompt" },
      {
        type: "image_url",
        image_url: { url: "https://example.com/generated.png" },
      },
    ]);
  });

  it("propagates abort signals to the OpenAI stream and stops retrying after cancellation mid-stream", async () => {
    const abortController = new AbortController();
    const onContentChunk = vi.fn();

    streamRunner.on.mockImplementation(
      (
        eventName: string,
        callback: (delta: string, snapshot: string) => void,
      ) => {
        if (eventName === "content") {
          callback("Partial", "Partial");
          abortController.abort();
        }

        return streamRunner;
      },
    );
    streamRunner.finalChatCompletion.mockRejectedValue(
      new Error("The operation was aborted."),
    );

    const payload = await generateStreamingResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Keep going." }],
        },
      ],
      taskId: "task_stream_abort",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
      abortSignal: abortController.signal,
      onContentChunk,
    });

    expect(openAiClient.chat.completions.stream).toHaveBeenCalledWith(
      expect.any(Object),
      {
        maxRetries: 0,
        signal: abortController.signal,
      },
    );
    expect(onContentChunk).toHaveBeenCalledWith("Partial", "Partial");
    expect(payload.errorType).toBe("unknown");
    expect(openAiClient.chat.completions.stream).toHaveBeenCalledTimes(1);
  });

  it("normalizes empty assistant content into an empty text response", async () => {
    streamRunner.on.mockImplementation(() => streamRunner);
    streamRunner.finalChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
          },
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 0,
        total_tokens: 5,
      },
    });
    streamRunner.totalUsage.mockResolvedValue({
      prompt_tokens: 5,
      completion_tokens: 0,
      total_tokens: 5,
    });

    const payload = await generateStreamingResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Reply with nothing." }],
        },
      ],
      taskId: "task_stream_empty",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    expect(payload.taskData?.content).toEqual([{ type: "text", text: "" }]);
    expect(payload.taskUsage).toBe(5);
  });
});
