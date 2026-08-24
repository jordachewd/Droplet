import { describe, expect, it } from "vitest";
import {
  classifyTaskComplexity,
  isExplicitDeepAnalysisRequest,
} from "@/lib/utils/openai/classify-task-complexity";
import { createTestMessage, createTextContentItem } from "../test-support";

function buildConversationTurns(turnCount: number) {
  return Array.from({ length: turnCount }, (_, index) =>
    createTestMessage({
      id: `msg_${index + 1}`,
      role: index % 2 === 0 ? "user" : "assistant",
      whois: index % 2 === 0 ? "user" : "assistant",
      content: [createTextContentItem(`turn ${index + 1}`)],
    }),
  );
}

describe("isExplicitDeepAnalysisRequest", () => {
  it("returns true when message requests deep analysis", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: "Please provide a deep dive and technical design review.",
    });

    expect(isExplicitDeepAnalysisRequest(latestUserMessage)).toBe(true);
  });

  it("returns false when message has no text content", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: [
        { type: "image_url", image_url: { url: "https://example.com" } },
      ],
    });

    expect(isExplicitDeepAnalysisRequest(latestUserMessage)).toBe(false);
  });
});

describe("classifyTaskComplexity", () => {
  it("returns standard when there is no usable latest message text", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: null,
    });

    expect(
      classifyTaskComplexity({
        messages: [],
        latestUserMessage,
      }),
    ).toBe("standard");
  });

  it("returns complex for explicit deep-analysis requests", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: "I need a root cause analysis with trade-offs.",
    });

    expect(
      classifyTaskComplexity({
        messages: [latestUserMessage],
        latestUserMessage,
      }),
    ).toBe("complex");
  });

  it("returns complex when latest prompt is very long", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: `Plan ${"x".repeat(520)}`,
    });

    expect(
      classifyTaskComplexity({
        messages: [latestUserMessage],
        latestUserMessage,
      }),
    ).toBe("complex");
  });

  it("returns complex when conversation history is deep", () => {
    const messages = buildConversationTurns(10);

    expect(
      classifyTaskComplexity({
        messages,
      }),
    ).toBe("complex");
  });

  it("returns complex with multiple analytical keywords and moderately long prompt", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: `Need help with algorithm performance and database schema migration. ${"details ".repeat(25)}`,
    });

    expect(
      classifyTaskComplexity({
        messages: [latestUserMessage],
        latestUserMessage,
      }),
    ).toBe("complex");
  });

  it("returns complex with multiple analytical keywords and moderate history", () => {
    const history = buildConversationTurns(6);
    const latestUserMessage = createTestMessage({
      id: "latest",
      role: "user",
      whois: "user",
      content:
        "Compare architecture options and debug database integration failures.",
    });

    expect(
      classifyTaskComplexity({
        messages: [...history, latestUserMessage],
      }),
    ).toBe("complex");
  });

  it("returns simple for short greeting-like prompts", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: "Hello",
    });

    expect(
      classifyTaskComplexity({
        messages: [latestUserMessage],
        latestUserMessage,
      }),
    ).toBe("simple");
  });

  it("returns standard when prompt is short but not covered by simple pattern", () => {
    const latestUserMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: "Generate.",
    });

    expect(
      classifyTaskComplexity({
        messages: [
          createTestMessage({
            role: "developer",
            whois: "developer",
            content: [createTextContentItem("context")],
          }),
          latestUserMessage,
        ],
      }),
    ).toBe("standard");
  });
});
