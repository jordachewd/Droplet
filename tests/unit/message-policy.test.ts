import { describe, expect, it } from "vitest";
import {
  compactMessagesToTokenLimit,
  estimateMessageTokens,
} from "@/lib/utils/openai/message-policy";
import type { Message } from "@/types";

describe("message-policy", () => {
  it("estimates non-zero token cost for image and audio content", () => {
    const imageAndAudioMessage: Message = {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: "https://example.com/a.png" },
        },
        {
          type: "audio_url",
          audio_url: "https://example.com/a.mp3",
        },
      ],
    };

    expect(estimateMessageTokens(imageAndAudioMessage)).toBe(800);
  });

  it("evicts older non-text items when token budget is exceeded", () => {
    const messages: Message[] = [
      {
        role: "system",
        content: "System context.",
      },
      {
        role: "assistant",
        content: [
          {
            type: "image_url",
            image_url: { url: "https://example.com/old.png" },
          },
        ],
      },
      {
        role: "user",
        content: "What should I do next?",
      },
    ];

    const compacted = compactMessagesToTokenLimit(messages, 40);

    expect(compacted).toEqual([messages[0], messages[2]]);
  });

  it("preserves non-text items on the most recent user message even over budget", () => {
    const messages: Message[] = [
      {
        role: "system",
        content: "System context.",
      },
      {
        role: "assistant",
        content: "Previous reply.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please describe this uploaded image in detail.",
          },
          {
            type: "image_url",
            image_url: { url: "https://example.com/latest.png" },
          },
        ],
      },
    ];

    const compacted = compactMessagesToTokenLimit(messages, 6);
    const latestUserMessage = compacted[compacted.length - 1];

    expect(latestUserMessage.role).toBe("user");
    expect(Array.isArray(latestUserMessage.content)).toBe(true);
    if (!Array.isArray(latestUserMessage.content)) {
      throw new Error("Expected latest user content to be an array.");
    }

    expect(
      latestUserMessage.content.some((item) => item.type === "image_url"),
    ).toBe(true);
  });

  it("keeps text-only compaction behavior unchanged", () => {
    const messages: Message[] = [
      {
        role: "system",
        content: "System context.",
      },
      {
        role: "assistant",
        content: "Older assistant context that should be dropped first.",
      },
      {
        role: "user",
        content: "Latest user prompt should remain fully visible.",
      },
    ];

    const compacted = compactMessagesToTokenLimit(messages, 18);

    expect(compacted).toHaveLength(3);
    expect(compacted[0]).toEqual(messages[0]);
    expect(compacted[1]?.role).toBe("assistant");
    expect(typeof compacted[1]?.content).toBe("string");
    expect((compacted[1]?.content as string).startsWith("... ")).toBe(true);
    expect(compacted[2]).toEqual(messages[2]);
  });
});
