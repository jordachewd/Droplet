import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestMessage } from "../test-support";

const {
  getPersonaMock,
  createCompletionMock,
  handleErrorMock,
  filterAssistantMsgMock,
  normalizePlanTierMock,
  resolveModelPolicyMock,
  compactMessagesToTokenLimitMock,
  titleSystemMsgMock,
} = vi.hoisted(() => ({
  getPersonaMock: vi.fn(),
  createCompletionMock: vi.fn(),
  handleErrorMock: vi.fn(),
  filterAssistantMsgMock: vi.fn(),
  normalizePlanTierMock: vi.fn(),
  resolveModelPolicyMock: vi.fn(),
  compactMessagesToTokenLimitMock: vi.fn(),
  titleSystemMsgMock: [
    {
      role: "system",
      content: "You are a title generator.",
    },
  ],
}));

vi.mock("@/constants/assistant-personas", () => ({
  getPersona: getPersonaMock,
}));

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    chat: {
      completions: {
        create: createCompletionMock,
      },
    },
  },
  titleSystemMsg: titleSystemMsgMock,
}));

vi.mock("@/lib/utils/handleError", () => ({
  handleError: handleErrorMock,
}));

vi.mock("@/lib/utils/openai/filterAssistantMsg", () => ({
  filterAssistantMsg: filterAssistantMsgMock,
}));

vi.mock("@/lib/utils/ai-model-policy", () => ({
  normalizePlanTier: normalizePlanTierMock,
  resolveModelPolicy: resolveModelPolicyMock,
}));

vi.mock("@/lib/utils/openai/message-policy", () => ({
  compactMessagesToTokenLimit: compactMessagesToTokenLimitMock,
}));

import { generateTitle } from "@/lib/utils/openai/generateTitle";

function parseSerializedResult(serializedResult: string | undefined) {
  if (!serializedResult) {
    throw new Error("Expected generateTitle to return serialized JSON.");
  }

  return JSON.parse(serializedResult) as Record<string, unknown>;
}

describe("generateTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPersonaMock.mockReturnValue({ label: "Developer" });
    normalizePlanTierMock.mockImplementation((planName: string) =>
      planName.toLowerCase(),
    );
    resolveModelPolicyMock.mockReturnValue({
      model: "gpt-4.1-nano",
      hardBlocked: false,
      notes: undefined,
      maxInputTokens: 1200,
      maxOutputTokens: 20,
    });
    filterAssistantMsgMock.mockImplementation((messages: unknown) => messages);
    compactMessagesToTokenLimitMock.mockImplementation(
      (messages: unknown) => messages,
    );
    handleErrorMock.mockImplementation(({ source }: { source?: string }) => {
      throw new Error(`handled:${source ?? "unknown"}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a title request, calls OpenAI, and returns serialized payload", async () => {
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_450);
    createCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 12,
        completion_tokens: 5,
        total_tokens: 17,
      },
      choices: [
        {
          message: {
            content: "Migration Rollout Checklist",
          },
        },
      ],
    });

    const messages = [
      createTestMessage({
        role: "user",
        whois: "user",
        content: "Help me plan deployment rollout",
      }),
    ];

    const serializedResult = await generateTitle(messages, "Lite", "developer");

    expect(nowSpy).toHaveBeenCalledTimes(2);
    expect(normalizePlanTierMock).toHaveBeenCalledWith("Lite");
    expect(resolveModelPolicyMock).toHaveBeenCalledWith({
      plan: "lite",
      feature: "title_generation",
      taskClass: "utility",
      modelOverrides: undefined,
    });
    expect(filterAssistantMsgMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({
          role: "developer",
          content: expect.stringContaining(
            "Conversation persona context: Developer",
          ),
        }),
        expect.objectContaining({
          role: "user",
        }),
      ]),
    );
    expect(compactMessagesToTokenLimitMock).toHaveBeenCalledWith(
      expect.any(Array),
      1200,
    );
    expect(createCompletionMock).toHaveBeenCalledWith({
      model: "gpt-4.1-nano",
      messages: expect.any(Array),
      max_completion_tokens: 20,
    });

    expect(parseSerializedResult(serializedResult)).toEqual({
      title: "Migration Rollout Checklist",
      usage: 17,
      model: "gpt-4.1-nano",
      requestMetric: {
        requestType: "title",
        model: "gpt-4.1-nano",
        tokensIn: 12,
        tokensOut: 5,
        latencyMs: 450,
      },
    });
  });

  it("delegates hard-blocked policy failures to handleError", async () => {
    resolveModelPolicyMock.mockReturnValue({
      model: "gpt-4.1-nano",
      hardBlocked: true,
      notes: "Title generation disabled.",
      maxInputTokens: 1200,
      maxOutputTokens: 20,
    });

    await expect(
      generateTitle(
        [createTestMessage({ content: "Any title request" })],
        "Lite",
        "developer",
      ),
    ).rejects.toThrow("handled:generateTitle");

    expect(createCompletionMock).not.toHaveBeenCalled();
    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateTitle",
      }),
    );
  });

  it("uses default hard-block message when policy notes are missing", async () => {
    resolveModelPolicyMock.mockReturnValue({
      model: "gpt-4.1-nano",
      hardBlocked: true,
      notes: undefined,
      maxInputTokens: 1200,
      maxOutputTokens: 20,
    });

    await expect(
      generateTitle(
        [createTestMessage({ content: "Any title request" })],
        "Lite",
      ),
    ).rejects.toThrow("handled:generateTitle");

    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateTitle",
        error: expect.objectContaining({
          message: "Title generation is blocked for the current request.",
        }),
      }),
    );
  });

  it("delegates empty-choice OpenAI responses to handleError", async () => {
    createCompletionMock.mockResolvedValue({
      usage: {
        prompt_tokens: 10,
        completion_tokens: 0,
        total_tokens: 10,
      },
      choices: [],
    });

    await expect(
      generateTitle(
        [createTestMessage({ content: "Generate one title" })],
        "Pro",
        "strategist",
      ),
    ).rejects.toThrow("handled:generateTitle");

    expect(handleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "generateTitle",
      }),
    );
  });

  it("falls back to zero usage when OpenAI usage metadata is missing", async () => {
    createCompletionMock.mockResolvedValue({
      usage: undefined,
      choices: [
        {
          message: {
            content: "Quick title",
          },
        },
      ],
    });

    const serializedResult = await generateTitle(
      [createTestMessage({ content: "Create quick title" })],
      "Lite",
    );

    expect(parseSerializedResult(serializedResult)).toEqual(
      expect.objectContaining({
        title: "Quick title",
        usage: 0,
      }),
    );
  });
});
