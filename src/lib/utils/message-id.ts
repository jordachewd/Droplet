import type { Message } from "@/types";

let fallbackMessageCounter = 0;

function createMessageId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  fallbackMessageCounter += 1;
  return `msg_${Date.now().toString(36)}_${fallbackMessageCounter.toString(36)}`;
}

export function ensureMessageHasId(message: Message): Message {
  if (typeof message.id === "string" && message.id.trim().length > 0) {
    return message;
  }

  return {
    ...message,
    id: createMessageId(),
  };
}

export function ensureMessagesHaveId(messages: Message[]): Message[] {
  return messages.map((message) => ensureMessageHasId(message));
}
