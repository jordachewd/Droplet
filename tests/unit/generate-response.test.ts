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
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
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
      entitlements: defaultEntitlements,
    });

    expect(generateImage).toHaveBeenCalledWith({
      prompt: "A mountain at sunrise",
      role: "assistant",
      taskId: "task_image",
      userId: "clerk_1",
    });
    const payload = JSON.parse(result as string);
    expect(payload.generatedImage).toBe(true);
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
      entitlements: defaultEntitlements,
    });

    expect(generateAudio).toHaveBeenCalledOnce();
    const payload = JSON.parse(result as string);
    expect(payload.generatedAudio).toBe(true);
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
      entitlements: defaultEntitlements,
    });

    const payload = JSON.parse(result as string);
    expect(payload.errorType).toBe("rate_limit");
  });
});
