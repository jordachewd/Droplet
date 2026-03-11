import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { openAiClient } from "@/constants/openai";
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
  allowedPersonaIds: [
    "strategist",
    "teacher",
    "developer",
    "creator",
  ] as PersonaId[],
  supportsImageGeneration: true,
  supportsAudioGeneration: true,
  imageLimitReached: false,
  audioLimitReached: false,
};

describe("generateResponse phase16", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text response payload with usage metadata on happy path", async () => {
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
        prompt_tokens: 18,
        completion_tokens: 6,
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

    expect(
      vi.mocked(openAiClient.chat.completions.create),
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1",
        max_completion_tokens: 1_400,
      }),
    );
    expect(payload.taskData.content[0].text).toContain("concise plan");
    expect(payload.taskUsage).toBe(24);
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestType: "chat",
          model: "gpt-4.1",
          tokensIn: 18,
          tokensOut: 6,
        }),
      ]),
    );
  });

  it("dispatches image tool calls with plan-aware model context", async () => {
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
        prompt_tokens: 20,
        completion_tokens: 13,
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
        requestMetric: {
          requestType: "image",
          model: "gpt-image-1.5",
          latencyMs: 42,
        },
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
    const payload = JSON.parse(result as string);

    expect(generateImage).toHaveBeenCalledWith({
      prompt: "A mountain at sunrise",
      role: "assistant",
      taskId: "task_image",
      userId: "clerk_1",
      planName: "Pro",
    });
    expect(payload.generatedImage).toBe(true);
    expect(payload.requestMetrics).toHaveLength(2);
  });

  it("dispatches audio tool calls with plan-aware model context", async () => {
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
        prompt_tokens: 14,
        completion_tokens: 7,
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
        requestMetric: {
          requestType: "audio",
          model: "gpt-audio-mini",
          latencyMs: 18,
        },
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
    const payload = JSON.parse(result as string);

    expect(generateAudio).toHaveBeenCalledWith({
      messages: [
        {
          role: "user",
          content: "Read this text out loud.",
        },
      ],
      role: "assistant",
      taskId: "task_audio",
      userId: "clerk_1",
      planName: "Pro",
      audioMode: "tts",
    });
    expect(payload.generatedAudio).toBe(true);
    expect(payload.requestMetrics).toHaveLength(2);
  });

  it("returns a blocked payload when media limits are reached", async () => {
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
        prompt_tokens: 11,
        completion_tokens: 7,
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
        imageLimitReached: true,
      },
    });
    const payload = JSON.parse(result as string);

    expect(generateImage).not.toHaveBeenCalled();
    expect(payload.blockedReason).toBe("media_limit_reached");
    expect(payload.requestMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestType: "image",
          blocked: true,
          blockedReason: "media_limit_reached",
        }),
      ]),
    );
  });

  it("classifies OpenAI 429 errors as rate_limit", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockRejectedValue(
      new APIError(429, {}, "Too many requests", new Headers()),
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

    expect(payload.errorType).toBe("rate_limit");
  });
});
