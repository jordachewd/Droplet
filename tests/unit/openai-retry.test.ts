import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { openAiClient } from "@/constants/openai";
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

const defaultParams = {
  messages: [
    {
      role: "user" as const,
      whois: "user" as const,
      content: [{ type: "text" as const, text: "Help me debug this route." }],
    },
  ],
  taskId: "task_retry",
  userId: "clerk_1",
  personaId: "strategist" as const,
  planName: "Pro" as const,
  entitlements: defaultEntitlements,
};

describe("OpenAI retry/backoff", () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    stderrWriteSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
    vi.useRealTimers();
  });

  it("retries transient failures with exponential backoff and fallback model selection", async () => {
    vi.mocked(openAiClient.chat.completions.create)
      .mockRejectedValueOnce(new APIError(429, {}, "Rate limit", new Headers()))
      .mockRejectedValueOnce(
        new APIError(503, {}, "Service unavailable", new Headers()),
      )
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Recovered response.",
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 6,
          total_tokens: 18,
        },
      } as never);

    const resultPromise = generateResponse(defaultParams);

    await vi.advanceTimersByTimeAsync(0);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(openAiClient.chat.completions.create).mock.calls[0],
    ).toEqual([
      expect.objectContaining({
        model: "gpt-4.1",
      }),
      { maxRetries: 0 },
    ]);

    await vi.advanceTimersByTimeAsync(999);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(openAiClient.chat.completions.create).mock.calls[1],
    ).toEqual([
      expect.objectContaining({
        model: "gpt-4o-mini",
      }),
      { maxRetries: 0 },
    ]);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(
      vi.mocked(openAiClient.chat.completions.create).mock.calls[2],
    ).toEqual([
      expect.objectContaining({
        model: "gpt-4o-mini",
      }),
      { maxRetries: 0 },
    ]);

    const payload = JSON.parse((await resultPromise) as string);

    expect(payload.taskData.content[0].text).toBe("Recovered response.");
    expect(stderrWriteSpy).toHaveBeenCalledTimes(2);
    expect(String(stderrWriteSpy.mock.calls[0][0])).toContain(
      "retry 1/3 in 1000ms",
    );
    expect(String(stderrWriteSpy.mock.calls[1][0])).toContain(
      "retry 2/3 in 2000ms",
    );
  });

  it("stops after three retries for transient failures", async () => {
    vi.mocked(openAiClient.chat.completions.create)
      .mockRejectedValueOnce(new APIError(429, {}, "Rate limit", new Headers()))
      .mockRejectedValueOnce(
        new APIError(500, {}, "Internal server error", new Headers()),
      )
      .mockRejectedValueOnce(
        new APIError(502, {}, "Bad gateway", new Headers()),
      )
      .mockRejectedValueOnce(
        new APIError(503, {}, "Service unavailable", new Headers()),
      );

    const resultPromise = generateResponse(defaultParams);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4_000);
    expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(4);

    const payload = JSON.parse((await resultPromise) as string);

    expect(payload.errorType).toBe("service_error");
    expect(stderrWriteSpy).toHaveBeenCalledTimes(3);
    expect(String(stderrWriteSpy.mock.calls[2][0])).toContain(
      "retry 3/3 in 4000ms",
    );
  });

  it.each([400, 401, 403])(
    "does not retry non-retryable status %s",
    async (statusCode) => {
      vi.mocked(openAiClient.chat.completions.create).mockRejectedValue(
        new APIError(statusCode, {}, `Status ${statusCode}`, new Headers()),
      );

      const payload = JSON.parse(
        (await generateResponse(defaultParams)) as string,
      );

      expect(openAiClient.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(stderrWriteSpy).not.toHaveBeenCalled();
      expect(payload.errorType).toBe("unknown");
    },
  );
});
