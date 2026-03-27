import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import type { PersonaId } from "@/types/PersonaData.d";
import { createTestTask, createTestUser } from "../test-support";

const {
  getPersonaMock,
  buildPersonaAwareSystemPromptMock,
  resolvePersonaPromptConfigMock,
  getChatToolsMock,
  createChatCompletionMock,
  streamChatCompletionMock,
  generateImageMock,
  generateAudioMock,
  generateVideoMock,
  normalizePlanTierMock,
  resolveModelPolicyMock,
  compactMessagesToTokenLimitMock,
} = vi.hoisted(() => ({
  getPersonaMock: vi.fn(),
  buildPersonaAwareSystemPromptMock: vi.fn(),
  resolvePersonaPromptConfigMock: vi.fn(),
  getChatToolsMock: vi.fn(),
  createChatCompletionMock: vi.fn(),
  streamChatCompletionMock: vi.fn(),
  generateImageMock: vi.fn(),
  generateAudioMock: vi.fn(),
  generateVideoMock: vi.fn(),
  normalizePlanTierMock: vi.fn(),
  resolveModelPolicyMock: vi.fn(),
  compactMessagesToTokenLimitMock: vi.fn(),
}));

vi.mock("@/constants/assistant-personas", () => ({
  getPersona: getPersonaMock,
}));

vi.mock("@/constants/persona-prompts", () => ({
  buildPersonaAwareSystemPrompt: buildPersonaAwareSystemPromptMock,
  resolvePersonaPromptConfig: resolvePersonaPromptConfigMock,
}));

vi.mock("@/constants/openai", () => ({
  getChatTools: getChatToolsMock,
  openAiClient: {
    chat: {
      completions: {
        create: createChatCompletionMock,
        stream: streamChatCompletionMock,
      },
    },
  },
}));

vi.mock("@/lib/utils/openai/generateImage", () => ({
  generateImage: generateImageMock,
}));

vi.mock("@/lib/utils/openai/generateAudio", () => ({
  generateAudio: generateAudioMock,
}));

vi.mock("@/lib/utils/openai/generateVideo", () => ({
  generateVideo: generateVideoMock,
}));

vi.mock("@/lib/utils/ai-model-policy", () => ({
  normalizePlanTier: normalizePlanTierMock,
  resolveModelPolicy: resolveModelPolicyMock,
}));

vi.mock("@/lib/utils/openai/message-policy", () => ({
  compactMessagesToTokenLimit: compactMessagesToTokenLimitMock,
}));

type TestEntitlements = {
  planName: "Lite" | "Pro" | "Premium";
  limits: {
    conversationsPerDay: number;
    promptsPerConversation: number;
    images: number;
    audio: number;
    video: number;
  };
  allowedPersonaIds: PersonaId[];
  supportsImageGeneration: boolean;
  supportsAudioGeneration: boolean;
  supportsVideoGeneration: boolean;
  imageLimitReached: boolean;
  audioLimitReached: boolean;
  videoLimitReached: boolean;
};

type TestPolicy = {
  model: string;
  fallbackModel: string;
  taskClass: string;
  hardBlocked: boolean;
  wasDowngraded: boolean;
  downgradeReasons: string[];
  notes?: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

function createEntitlements(
  overrides: Partial<TestEntitlements> = {},
): TestEntitlements {
  return {
    planName: "Lite",
    limits: {
      conversationsPerDay: 5,
      promptsPerConversation: 10,
      images: 3,
      audio: 3,
      video: 1,
    },
    allowedPersonaIds: ["strategist", "developer"],
    supportsImageGeneration: true,
    supportsAudioGeneration: true,
    supportsVideoGeneration: true,
    imageLimitReached: false,
    audioLimitReached: false,
    videoLimitReached: false,
    ...overrides,
  };
}

function createPolicy(overrides: Partial<TestPolicy> = {}): TestPolicy {
  return {
    model: "gpt-4.1",
    fallbackModel: "gpt-4o-mini",
    taskClass: "standard",
    hardBlocked: false,
    wasDowngraded: false,
    downgradeReasons: [],
    maxInputTokens: 3_000,
    maxOutputTokens: 600,
    ...overrides,
  };
}

function createBaseMessages() {
  return [{ role: "user", whois: "user", content: "Hello" }] as const;
}

function createResponseRequest(
  overrides: Partial<Parameters<typeof generateResponse>[0]> = {},
) {
  const task = createTestTask();
  const user = createTestUser();

  return {
    messages: [...createBaseMessages()],
    taskId: task._id,
    userId: user.clerkId,
    planName: "Lite" as const,
    entitlements: createEntitlements(),
    ...overrides,
  };
}

function createStreamingRequest(
  overrides: Partial<Parameters<typeof generateStreamingResponse>[0]> = {},
) {
  const task = createTestTask();
  const user = createTestUser();

  return {
    messages: [...createBaseMessages()],
    taskId: task._id,
    userId: user.clerkId,
    planName: "Lite" as const,
    entitlements: createEntitlements(),
    ...overrides,
  };
}

function parsePayload<TValue>(payload: unknown): TValue {
  return payload as TValue;
}

describe("generateResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPersonaMock.mockImplementation((personaId?: string | null) => ({
      id: personaId ?? "strategist",
    }));
    buildPersonaAwareSystemPromptMock.mockReturnValue([
      { role: "system", content: "System prompt" },
    ]);
    resolvePersonaPromptConfigMock.mockReturnValue({
      temperature: 0.3,
      maxTokens: 400,
    });
    getChatToolsMock.mockReturnValue([]);
    compactMessagesToTokenLimitMock.mockImplementation(
      (messages: unknown) => messages,
    );
    normalizePlanTierMock.mockImplementation(
      (planName?: string | null) => planName?.toLowerCase() ?? "lite",
    );
    resolveModelPolicyMock.mockImplementation(
      (params: { feature?: string; audioMode?: string }) => {
        switch (params.feature) {
          case "image_generation":
            return createPolicy({
              model: "gpt-image-1-mini",
              taskClass: "final",
            });
          case "audio_generation":
            return createPolicy({
              model:
                params.audioMode === "tts"
                  ? "gpt-4o-mini-tts"
                  : "gpt-audio-mini",
              taskClass: "final",
            });
          case "video_generation":
            return createPolicy({ model: "sora-2", taskClass: "final" });
          default:
            return createPolicy({ model: "gpt-4.1", taskClass: "standard" });
        }
      },
    );
  });

  it("returns policy_blocked when chat policy is hard blocked", async () => {
    resolveModelPolicyMock.mockImplementation(
      (params: { feature?: string }) => {
        if (params.feature === "chat") {
          return createPolicy({
            model: "blocked",
            hardBlocked: true,
            notes: "Blocked by policy.",
          });
        }

        return createPolicy();
      },
    );

    const serialized = await generateResponse(createResponseRequest());

    const payload = parsePayload<{
      errorType: string;
      errorMessage: string;
      requestMetrics: unknown[];
    }>(serialized);

    expect(payload).toEqual({
      errorType: "policy_blocked",
      errorMessage: "Blocked by policy.",
      requestMetrics: [],
    });
    expect(createChatCompletionMock).not.toHaveBeenCalled();
  });

  it("returns assistant text payload and chat metric for standard chat completions", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 20,
        completion_tokens: 8,
        total_tokens: 28,
      },
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from assistant",
          },
        },
      ],
    });

    const serialized = await generateResponse(
      createResponseRequest({
        personaId: "developer",
      }),
    );

    const payload = parsePayload<{
      taskData: { content: Array<{ type: string; text: string }> };
      taskUsage: number;
      generatedImage: boolean;
      generatedAudio: boolean;
      generatedVideo: boolean;
      requestMetrics: Array<{ requestType: string; model: string }>;
    }>(serialized);

    expect(payload.taskData.content[0]).toEqual({
      type: "text",
      text: "Hello from assistant",
    });
    expect(payload.taskUsage).toBe(28);
    expect(payload.generatedImage).toBe(false);
    expect(payload.generatedAudio).toBe(false);
    expect(payload.generatedVideo).toBe(false);
    expect(payload.requestMetrics).toEqual([
      expect.objectContaining({
        requestType: "chat",
        model: "gpt-4.1",
      }),
    ]);
  });

  it("returns image_disabled when image tool is requested but image is not enabled", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 11,
        completion_tokens: 6,
        total_tokens: 17,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedImage",
                  arguments: JSON.stringify({ prompt: "a mountain" }),
                },
              },
            ],
          },
        },
      ],
    });

    const serialized = await generateResponse(
      createResponseRequest({
        entitlements: createEntitlements({
          supportsImageGeneration: false,
        }),
      }),
    );

    const payload = parsePayload<{
      blockedReason: string;
      taskData: { content: Array<{ text: string }> };
      requestMetrics: Array<{ requestType: string; blockedReason?: string }>;
    }>(serialized);

    expect(payload.blockedReason).toBe("image_disabled");
    expect(payload.taskData.content[0]?.text).toContain(
      "Image generation is not enabled",
    );
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestType: "chat",
        }),
        expect.objectContaining({
          requestType: "image",
          blockedReason: "image_disabled",
        }),
      ]),
    );
    expect(generateImageMock).not.toHaveBeenCalled();
  });

  it("returns image_limit_reached when image slot claim fails", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 13,
        completion_tokens: 7,
        total_tokens: 20,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedImage",
                  arguments: JSON.stringify({ prompt: "stormy sky" }),
                },
              },
            ],
          },
        },
      ],
    });

    const claimMediaGenerationSlot = vi.fn().mockResolvedValue({
      claimed: false,
    });

    const serialized = await generateResponse(
      createResponseRequest({
        claimMediaGenerationSlot,
      }),
    );

    const payload = parsePayload<{
      blockedReason: string;
      taskData: { content: Array<{ text: string }> };
    }>(serialized);

    expect(payload.blockedReason).toBe("image_limit_reached");
    expect(payload.taskData.content[0]?.text).toContain("limit reached");
    expect(claimMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "images",
    });
    expect(generateImageMock).not.toHaveBeenCalled();
  });

  it("merges generated image payload and request metrics on successful image tool call", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 12,
        completion_tokens: 6,
        total_tokens: 18,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedImage",
                  arguments: JSON.stringify({ prompt: "sunset skyline" }),
                },
              },
            ],
          },
        },
      ],
    });

    const claimMediaGenerationSlot = vi.fn().mockResolvedValue({
      claimed: true,
    });
    generateImageMock.mockResolvedValue({
      taskData: {
        role: "assistant",
        whois: "assistant",
        content: [
          {
            type: "text",
            text: "sunset skyline",
          },
        ],
      },
      generatedImage: true,
      requestMetric: {
        requestType: "image",
        model: "gpt-image-1-mini",
        latencyMs: 44,
      },
    });

    const serialized = await generateResponse(
      createResponseRequest({
        claimMediaGenerationSlot,
      }),
    );

    const payload = parsePayload<{
      taskUsage: number;
      generatedImage: boolean;
      requestMetrics: Array<{ requestType: string }>;
    }>(serialized);

    expect(payload.taskUsage).toBe(18);
    expect(payload.generatedImage).toBe(true);
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestType: "chat" }),
        expect.objectContaining({ requestType: "image" }),
      ]),
    );
  });

  it("rolls back image slot and returns service_error when image generation fails", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 9,
        completion_tokens: 4,
        total_tokens: 13,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedImage",
                  arguments: JSON.stringify({ prompt: "broken image" }),
                },
              },
            ],
          },
        },
      ],
    });

    const claimMediaGenerationSlot = vi.fn().mockResolvedValue({
      claimed: true,
    });
    const rollbackMediaGenerationSlot = vi.fn().mockResolvedValue(undefined);
    generateImageMock.mockRejectedValue(new Error("image service down"));

    const serialized = await generateResponse(
      createResponseRequest({
        claimMediaGenerationSlot,
        rollbackMediaGenerationSlot,
      }),
    );

    const payload = parsePayload<{
      errorType: string;
      errorMessage: string;
      requestMetrics: Array<{ requestType: string }>;
    }>(serialized);

    expect(payload.errorType).toBe("service_error");
    expect(payload.errorMessage).toBe(
      "Image generation failed. Please try again.",
    );
    expect(rollbackMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "images",
    });
    expect(payload.requestMetrics).toEqual([
      expect.objectContaining({ requestType: "chat" }),
    ]);
  });

  it("handles audio tool calls and returns audio_disabled when feature is not enabled", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 7,
        completion_tokens: 5,
        total_tokens: 12,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedAudio",
                  arguments: JSON.stringify({ content: "Speak this text" }),
                },
              },
            ],
          },
        },
      ],
    });

    const serialized = await generateResponse(
      createResponseRequest({
        entitlements: createEntitlements({
          supportsAudioGeneration: false,
        }),
      }),
    );

    const payload = parsePayload<{
      blockedReason: string;
      taskData: { content: Array<{ text: string }> };
      requestMetrics: Array<{ requestType: string; blockedReason?: string }>;
    }>(serialized);

    expect(payload.blockedReason).toBe("audio_disabled");
    expect(payload.taskData.content[0]?.text).toContain(
      "Audio generation is not enabled",
    );
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestType: "audio",
          blockedReason: "audio_disabled",
        }),
      ]),
    );
    expect(generateAudioMock).not.toHaveBeenCalled();
  });

  it("returns audio_limit_reached when audio slot claim fails", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 7,
        completion_tokens: 5,
        total_tokens: 12,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedAudio",
                  arguments: JSON.stringify({ content: "Speak this text" }),
                },
              },
            ],
          },
        },
      ],
    });

    const claimMediaGenerationSlot = vi.fn().mockResolvedValue({
      claimed: false,
    });

    const serialized = await generateResponse(
      createResponseRequest({
        claimMediaGenerationSlot,
      }),
    );

    const payload = parsePayload<{
      blockedReason: string;
      taskData: { content: Array<{ text: string }> };
    }>(serialized);

    expect(payload.blockedReason).toBe("audio_limit_reached");
    expect(payload.taskData.content[0]?.text).toContain("limit reached");
    expect(claimMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "audio",
    });
    expect(generateAudioMock).not.toHaveBeenCalled();
  });

  it("handles video tool calls and merges generated video payload", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 8,
        completion_tokens: 6,
        total_tokens: 14,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedVideo",
                  arguments: JSON.stringify({
                    prompt: "Time-lapse city lights",
                  }),
                },
              },
            ],
          },
        },
      ],
    });

    const claimMediaGenerationSlot = vi.fn().mockResolvedValue({
      claimed: true,
    });
    generateVideoMock.mockResolvedValue({
      taskData: {
        role: "assistant",
        whois: "assistant",
        content: [{ type: "text", text: "Time-lapse city lights" }],
      },
      generatedVideo: true,
      requestMetric: {
        requestType: "video",
        model: "sora-2",
        latencyMs: 99,
      },
    });

    const serialized = await generateResponse(
      createResponseRequest({
        claimMediaGenerationSlot,
      }),
    );

    const payload = parsePayload<{
      taskUsage: number;
      generatedVideo: boolean;
      requestMetrics: Array<{ requestType: string }>;
    }>(serialized);

    expect(payload.taskUsage).toBe(14);
    expect(payload.generatedVideo).toBe(true);
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestType: "chat" }),
        expect.objectContaining({ requestType: "video" }),
      ]),
    );
  });

  it("returns video_limit_reached when video tool is unavailable due to limit state", async () => {
    createChatCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 8,
        completion_tokens: 6,
        total_tokens: 14,
      },
      choices: [
        {
          message: {
            role: "assistant",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedVideo",
                  arguments: JSON.stringify({
                    prompt: "Do not generate",
                  }),
                },
              },
            ],
          },
        },
      ],
    });

    const serialized = await generateResponse(
      createResponseRequest({
        entitlements: createEntitlements({
          supportsVideoGeneration: false,
          videoLimitReached: true,
        }),
      }),
    );

    const payload = parsePayload<{
      blockedReason: string;
      taskData: { content: Array<{ text: string }> };
    }>(serialized);

    expect(payload.blockedReason).toBe("video_limit_reached");
    expect(payload.taskData.content[0]?.text).toContain("limit reached");
    expect(generateVideoMock).not.toHaveBeenCalled();
  });

  it("returns unknown error type when chat completion throws a non-API error", async () => {
    createChatCompletionMock.mockRejectedValue(new Error("network down"));

    const serialized = await generateResponse(createResponseRequest());

    const payload = parsePayload<{
      errorType: string;
      requestMetrics: unknown[];
    }>(serialized);

    expect(payload).toEqual({
      errorType: "unknown",
      requestMetrics: [],
    });
  });
});

describe("generateStreamingResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPersonaMock.mockReturnValue({ id: "strategist" });
    buildPersonaAwareSystemPromptMock.mockReturnValue([
      { role: "system", content: "System prompt" },
    ]);
    resolvePersonaPromptConfigMock.mockReturnValue({
      temperature: 0.3,
      maxTokens: 400,
    });
    compactMessagesToTokenLimitMock.mockImplementation(
      (messages: unknown) => messages,
    );
    normalizePlanTierMock.mockImplementation(
      (planName?: string | null) => planName?.toLowerCase() ?? "lite",
    );
    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        model: "gpt-4.1",
        hardBlocked: false,
      }),
    );
    getChatToolsMock.mockReturnValue([]);
  });

  it("streams content chunks and returns final payload with metrics", async () => {
    const onContentChunk = vi.fn();
    let contentHandler: ((delta: string, snapshot: string) => void) | null =
      null;

    streamChatCompletionMock.mockReturnValue({
      on: vi.fn(
        (eventName: string, callback: (a: string, b: string) => void) => {
          if (eventName === "content") {
            contentHandler = callback;
          }
        },
      ),
      finalChatCompletion: vi.fn(async () => {
        contentHandler?.("Hi", "Hi there");

        return {
          usage: undefined,
          choices: [
            {
              message: {
                role: "assistant",
                content: "Hi there",
              },
            },
          ],
        };
      }),
      totalUsage: vi.fn(async () => ({
        prompt_tokens: 14,
        completion_tokens: 5,
        total_tokens: 19,
      })),
    });

    const payload = await generateStreamingResponse(
      createStreamingRequest({
        messages: [{ role: "user", whois: "user", content: "Hello stream" }],
        onContentChunk,
      }),
    );

    expect(onContentChunk).toHaveBeenCalledWith("Hi", "Hi there");
    expect(payload.taskData).toEqual({
      role: "assistant",
      whois: "assistant",
      content: [{ type: "text", text: "Hi there" }],
    });
    expect(payload.taskUsage).toBe(19);
    expect(payload.requestMetrics).toEqual([
      expect.objectContaining({
        requestType: "chat",
        model: "gpt-4.1",
        tokensIn: 14,
        tokensOut: 5,
      }),
    ]);
  });
});
