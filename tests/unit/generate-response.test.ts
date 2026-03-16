import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { openAiClient } from "@/constants/openai";
import { PLAN_LIMITS } from "@/constants/plans";
import { generateImage } from "@/lib/utils/openai/generateImage";
import { generateAudio } from "@/lib/utils/openai/generateAudio";
import { PersonaId } from "@/types/PersonaData.d";

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  getChatTools: vi.fn(() => []),
}));

vi.mock("@/lib/utils/openai/generateImage", () => ({
  generateImage: vi.fn(),
}));

vi.mock("@/lib/utils/openai/generateAudio", () => ({
  generateAudio: vi.fn(),
}));

const defaultEntitlements = {
  planName: "Pro" as const,
  limits: PLAN_LIMITS.Pro,
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

describe("generateResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text response payload with usage on happy path", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Here is a concise plan.",
          },
        },
      ],
      usage: {
        total_tokens: 24,
      },
    } as never);

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Help me plan my week." }],
        },
      ],
      taskId: "task_1",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1",
        max_completion_tokens: 1_100,
      }),
      { maxRetries: 0 },
    );
    expect(payload.taskData).toBeTruthy();
    expect(payload.taskData.content[0].text).toContain("concise plan");
    expect(payload.taskUsage).toBe(24);
  });

  it("dispatches image tool calls to generateImage", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "A mountain at sunrise",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 33,
      },
    } as never);

    vi.mocked(generateImage).mockResolvedValue(
      JSON.stringify({
        taskData: {
          role: "assistant",
          whois: "assistant",
          content: [{ type: "text", text: "Image generated." }],
        },
        generatedImage: true,
      }),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image for me." }],
        },
      ],
      taskId: "task_image",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    expect(generateImage).toHaveBeenCalledWith({
      prompt: "A mountain at sunrise",
      role: "assistant",
      taskId: "task_image",
      userId: "clerk_1",
      planName: "Pro",
    });
    const payload = JSON.parse(result as string);
    expect(payload.generatedImage).toBe(true);
  });

  it("returns media_limit_reached when atomic image slot claim fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "A mountain at sunrise",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 33,
      },
    } as never);

    const claimMediaGenerationSlot = vi
      .fn()
      .mockResolvedValue({ claimed: false });

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image for me." }],
        },
      ],
      taskId: "task_image",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
      claimMediaGenerationSlot,
    });

    const payload = JSON.parse(result as string);
    expect(claimMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "images",
    });
    expect(generateImage).not.toHaveBeenCalled();
    expect(payload.blockedReason).toBe("media_limit_reached");
    expect(payload.taskData.content[0].text).toContain("limit reached");
  });

  it("rolls back claimed image slot when image generation fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "A failed image prompt",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 20,
      },
    } as never);
    vi.mocked(generateImage).mockRejectedValue(
      new Error("OpenAI images API unavailable"),
    );

    const claimMediaGenerationSlot = vi
      .fn()
      .mockResolvedValue({ claimed: true });
    const rollbackMediaGenerationSlot = vi.fn().mockResolvedValue(undefined);

    await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image." }],
        },
      ],
      taskId: "task_image_openai_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
      claimMediaGenerationSlot,
      rollbackMediaGenerationSlot,
    });

    expect(claimMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "images",
    });
    expect(rollbackMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "images",
    });
  });

  it("returns a structured service error when image generation fails due to OpenAI API errors", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "A failed image prompt",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 20,
      },
    } as never);
    vi.mocked(generateImage).mockRejectedValue(
      new Error("OpenAI images API unavailable"),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image." }],
        },
      ],
      taskId: "task_image_openai_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("service_error");
    expect(payload.errorMessage).toBe(
      "Image generation failed. Please try again.",
    );
  });

  it("returns a structured service error when image upload to S3 fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "Upload this image",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 20,
      },
    } as never);
    vi.mocked(generateImage).mockRejectedValue(
      new Error("S3 upload failed for generated image"),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image." }],
        },
      ],
      taskId: "task_image_s3_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("service_error");
    expect(payload.errorMessage).toBe(
      "Image generation failed. Please try again.",
    );
  });

  it("returns a structured service error when image conversion fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                    prompt: "Convert this image",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 20,
      },
    } as never);
    vi.mocked(generateImage).mockRejectedValue(
      new Error("Sharp conversion failed"),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate an image." }],
        },
      ],
      taskId: "task_image_sharp_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("service_error");
    expect(payload.errorMessage).toBe(
      "Image generation failed. Please try again.",
    );
  });

  it("dispatches audio tool calls to generateAudio", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedAudio",
                  arguments: JSON.stringify({
                    role: "user",
                    content: "Read this text out loud.",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 21,
      },
    } as never);

    vi.mocked(generateAudio).mockResolvedValue(
      JSON.stringify({
        taskData: {
          role: "assistant",
          whois: "assistant",
          content: [{ type: "text", text: "Audio generated." }],
        },
        generatedAudio: true,
      }),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Create audio." }],
        },
      ],
      taskId: "task_audio",
      userId: "clerk_1",
      personaId: "teacher",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    expect(generateAudio).toHaveBeenCalledWith({
      ttsText: "Read this text out loud.",
      role: "assistant",
      taskId: "task_audio",
      userId: "clerk_1",
      planName: "Pro",
      audioMode: "tts",
    });
    const payload = JSON.parse(result as string);
    expect(payload.generatedAudio).toBe(true);
  });

  it("rolls back claimed audio slot when audio generation fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedAudio",
                  arguments: JSON.stringify({
                    role: "user",
                    content: "Read this text out loud.",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 21,
      },
    } as never);
    vi.mocked(generateAudio).mockRejectedValue(
      new Error("Audio provider failed"),
    );

    const claimMediaGenerationSlot = vi
      .fn()
      .mockResolvedValue({ claimed: true });
    const rollbackMediaGenerationSlot = vi.fn().mockResolvedValue(undefined);

    await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Create audio." }],
        },
      ],
      taskId: "task_audio_error",
      userId: "clerk_1",
      personaId: "teacher",
      planName: "Pro",
      entitlements: defaultEntitlements,
      claimMediaGenerationSlot,
      rollbackMediaGenerationSlot,
    });

    expect(claimMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "audio",
    });
    expect(rollbackMediaGenerationSlot).toHaveBeenCalledWith({
      limitType: "audio",
    });
  });

  it("returns a structured service error when audio generation fails", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "getGeneratedAudio",
                  arguments: JSON.stringify({
                    role: "user",
                    content: "Read this text out loud.",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 21,
      },
    } as never);
    vi.mocked(generateAudio).mockRejectedValue(
      new Error("Audio provider failed"),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Create audio." }],
        },
      ],
      taskId: "task_audio_error",
      userId: "clerk_1",
      personaId: "teacher",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("service_error");
    expect(payload.errorMessage).toBe(
      "Audio generation failed. Please try again.",
    );
  });

  it("returns entitlement-blocked message when image capability is disabled", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
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
                  arguments: JSON.stringify({ prompt: "A city skyline" }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 18,
      },
    } as never);

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Generate image." }],
        },
      ],
      taskId: "task_blocked",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: {
        ...defaultEntitlements,
        supportsImageGeneration: false,
      },
    });

    expect(generateImage).not.toHaveBeenCalled();
    const payload = JSON.parse(result as string);
    expect(payload.blockedReason).toBe("image_disabled");
    expect(payload.taskData.content[0].text).toContain("not enabled");
  });

  it("fails immediately for non-retryable OpenAI 400 errors", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockRejectedValue(
      new APIError(400, {}, "Bad request", new Headers()),
    );

    const result = await generateResponse({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      taskId: "task_error",
      userId: "clerk_1",
      personaId: "strategist",
      planName: "Pro",
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("unknown");
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
