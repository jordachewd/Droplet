import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStreamingResponse } from "@/lib/utils/openai/generateResponse";
import { openAiClient } from "@/constants/openai";
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
        max_completion_tokens: 1_400,
      }),
      undefined,
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
});
