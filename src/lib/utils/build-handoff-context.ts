import type { Message } from "@/types";

const MAX_CONTEXT_MESSAGES = 20;

function extractTextFromMessage(message: Message): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((item) => item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n");
  }

  return "";
}

export function buildHandoffContext({
  messages,
  sourcePersonaLabel,
  sourceTitle,
}: {
  messages: Message[];
  sourcePersonaLabel: string;
  sourceTitle: string;
}): string {
  const relevantMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_CONTEXT_MESSAGES);

  if (relevantMessages.length === 0) {
    return "";
  }

  const summary = relevantMessages
    .map((m) => {
      const speaker = m.role === "user" ? "User" : sourcePersonaLabel;
      const text = extractTextFromMessage(m).trim();
      return text ? `${speaker}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    `[Handoff from "${sourceTitle}" — conversation with ${sourcePersonaLabel}]`,
    "",
    "Here is the context from my previous conversation:",
    "",
    summary,
    "",
    "Please continue helping me based on this context.",
  ].join("\n");
}
