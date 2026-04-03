import { Message } from "@/types";

export function filterAssistantMsg(messages: Message[]) {
  return messages.map((message) => {
    if (message.whois === "assistant") {
      return {
        ...message,
        content: Array.isArray(message.content)
          ? message.content.filter(
              (item) => item.type !== "image_url" && item.type !== "audio_url",
            )
          : message.content,
      };
    }
    return message;
  });
}
