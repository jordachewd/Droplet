import { ContentItem, Message } from "@/types";

const APPROX_CHARS_PER_TOKEN = 4;

function trimTextToApproxTokenLimit(text: string, maxTokens: number): string {
  if (maxTokens <= 0) {
    return "";
  }

  const maxCharacters = maxTokens * APPROX_CHARS_PER_TOKEN;

  if (text.length <= maxCharacters) {
    return text;
  }

  const visibleCharacters = Math.max(0, maxCharacters - 4);
  return `... ${text.slice(-visibleCharacters)}`;
}

function getTextFromContent(content: Message["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (item): item is ContentItem & { type: "text"; text: string } =>
        item.type === "text" &&
        typeof item.text === "string" &&
        item.text.length > 0,
    )
    .map((item) => item.text)
    .join("\n");
}

function estimateMessageTokens(message: Message): number {
  const text = getTextFromContent(message.content);

  if (!text) {
    return 0;
  }

  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function trimMessageToTokenLimit(message: Message, maxTokens: number): Message {
  if (typeof message.content === "string") {
    return {
      ...message,
      content: trimTextToApproxTokenLimit(message.content, maxTokens),
    };
  }

  if (!Array.isArray(message.content)) {
    return message;
  }

  let remainingTokens = maxTokens;
  const compactedContent: ContentItem[] = [];

  for (const item of [...message.content].reverse()) {
    if (item.type !== "text") {
      compactedContent.push(item);
      continue;
    }

    if (
      remainingTokens <= 0 ||
      typeof item.text !== "string" ||
      item.text.length === 0
    ) {
      continue;
    }

    const trimmedText = trimTextToApproxTokenLimit(item.text, remainingTokens);
    remainingTokens = Math.max(
      0,
      remainingTokens - Math.ceil(trimmedText.length / APPROX_CHARS_PER_TOKEN),
    );
    compactedContent.push({
      ...item,
      text: trimmedText,
    });
  }

  return {
    ...message,
    content: compactedContent.reverse(),
  };
}

export function compactMessagesToTokenLimit(
  messages: Message[],
  maxInputTokens?: number,
): Message[] {
  if (!maxInputTokens || maxInputTokens <= 0 || messages.length === 0) {
    return messages;
  }

  const leadingContextMessages: Message[] = [];
  const conversationMessages: Message[] = [];

  for (const message of messages) {
    if (
      conversationMessages.length === 0 &&
      (message.role === "system" || message.role === "developer")
    ) {
      leadingContextMessages.push(message);
      continue;
    }

    conversationMessages.push(message);
  }

  const leadingContextTokens = leadingContextMessages.reduce(
    (total, message) => total + estimateMessageTokens(message),
    0,
  );

  if (leadingContextTokens >= maxInputTokens) {
    return leadingContextMessages;
  }

  let remainingTokens = maxInputTokens - leadingContextTokens;
  const compactedConversation: Message[] = [];

  for (const message of [...conversationMessages].reverse()) {
    const messageTokens = estimateMessageTokens(message);

    if (messageTokens <= remainingTokens) {
      compactedConversation.push(message);
      remainingTokens -= messageTokens;
      continue;
    }

    if (remainingTokens > 0) {
      compactedConversation.push(
        trimMessageToTokenLimit(message, remainingTokens),
      );
    }

    break;
  }

  return [...leadingContextMessages, ...compactedConversation.reverse()];
}

export function buildTextToSpeechInput(messages: Message[]): string {
  return messages
    .map((message) => getTextFromContent(message.content))
    .filter((text) => text.length > 0)
    .join("\n\n")
    .trim();
}
