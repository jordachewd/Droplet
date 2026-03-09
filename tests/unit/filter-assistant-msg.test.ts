import { describe, expect, it } from "vitest";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import { Message } from "@/types";

describe("filterAssistantMsg", () => {
  it("removes image/audio tool outputs from assistant messages", () => {
    const messages: Message[] = [
      {
        whois: "assistant",
        role: "assistant",
        content: [
          { type: "text", text: "hello" },
          {
            type: "image_url",
            image_url: { url: "https://example.com/a.png" },
          },
          { type: "audio_url", audio_url: "audio-data" },
        ],
      },
    ];

    const result = filterAssistantMsg(messages);

    expect(result).toEqual([
      {
        whois: "assistant",
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
      },
    ]);
  });

  it("keeps non-assistant messages untouched", () => {
    const userMessage: Message = {
      whois: "user",
      role: "user",
      content: "Keep me",
    };

    const [result] = filterAssistantMsg([userMessage]);

    expect(result).toBe(userMessage);
  });
});
