import { describe, expect, it } from "vitest";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import { createTestMessage, createTextContentItem } from "../test-support";

describe("filterAssistantMsg", () => {
  it("removes media content items from assistant array content", () => {
    const assistantMessage = createTestMessage({
      id: "assistant_1",
      role: "assistant",
      whois: "assistant",
      content: [
        createTextContentItem("Keep this text"),
        { type: "temp", text: "Keep temp item" },
        { type: "image_url", image_url: { url: "https://example.com/i.png" } },
        { type: "audio_url", audio_url: "https://example.com/a.mp3" },
      ],
    });

    const result = filterAssistantMsg([assistantMessage]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ...assistantMessage,
      content: [
        createTextContentItem("Keep this text"),
        { type: "temp", text: "Keep temp item" },
      ],
    });
  });

  it("keeps assistant string content unchanged", () => {
    const assistantMessage = createTestMessage({
      role: "assistant",
      whois: "assistant",
      content: "Plain assistant output",
    });

    const result = filterAssistantMsg([assistantMessage]);

    expect(result[0]).toEqual(assistantMessage);
  });

  it("returns non-assistant messages unchanged and preserves reference", () => {
    const userMessage = createTestMessage({
      role: "user",
      whois: "user",
      content: [createTextContentItem("Hello")],
    });

    const result = filterAssistantMsg([userMessage]);

    expect(result[0]).toBe(userMessage);
  });
});
