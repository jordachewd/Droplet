import { describe, expect, it } from "vitest";
import {
  buildTextToSpeechInput,
  compactMessagesToTokenLimit,
  estimateMessageTokens,
} from "@/lib/utils/openai/message-policy";
import { createTestTask } from "../test-support";

describe("message-policy", () => {
  it("estimates tokens for text and media content", () => {
    const message = {
      ...createTestTask().messages[0],
      content: [
        { type: "text" as const, text: "hello world" },
        {
          type: "image_url" as const,
          image_url: { url: "https://example.com/i.png" },
        },
      ],
    };

    const tokens = estimateMessageTokens(message);

    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeGreaterThanOrEqual(300);
  });

  it("compacts conversation messages to stay within token limits", () => {
    const task = createTestTask();
    const messages = [
      {
        role: "system" as const,
        content: "system context",
      },
      ...Array.from({ length: 6 }).map((_, index) => ({
        ...task.messages[0],
        id: `msg_${index}`,
        content: [
          { type: "text" as const, text: `message ${index} `.repeat(80) },
        ],
      })),
    ];

    const compacted = compactMessagesToTokenLimit(messages, 40);

    expect(compacted[0]?.role).toBe("system");
    expect(compacted.length).toBeLessThan(messages.length);
  });

  it("builds text-to-speech input from message text content only", () => {
    const task = createTestTask();
    const input = buildTextToSpeechInput([
      {
        ...task.messages[0],
        content: [{ type: "text", text: "First" }],
      },
      {
        role: "assistant",
        content: [
          { type: "image_url", image_url: { url: "https://example.com" } },
        ],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Second" }],
      },
    ]);

    expect(input).toBe("First\n\nSecond");
  });
});
