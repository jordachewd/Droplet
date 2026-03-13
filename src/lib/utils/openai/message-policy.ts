import { ContentItem, Message } from "@/types";

const APPROX_CHARS_PER_TOKEN = 4;
const APPROX_IMAGE_ITEM_TOKENS = 300;
const APPROX_AUDIO_ITEM_TOKENS = 500;

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

function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function estimateContentItemTokens(item: ContentItem): number {
  if (item.type === "text" && typeof item.text === "string" && item.text) {
    return estimateTextTokens(item.text);
  }

  // Heuristic costs: we intentionally over-estimate non-text payloads to avoid
  // keeping old image/audio items that can blow the model context window.
  if (item.type === "image_url") {
    return APPROX_IMAGE_ITEM_TOKENS;
  }

  if (item.type === "audio_url") {
    return APPROX_AUDIO_ITEM_TOKENS;
  }

  return 0;
}

export function estimateMessageTokens(message: Message): number {
  if (typeof message.content === "string") {
    return message.content ? estimateTextTokens(message.content) : 0;
  }

  if (!Array.isArray(message.content)) {
    return 0;
  }

  return message.content.reduce(
    (total, item) => total + estimateContentItemTokens(item),
    0,
  );
}

function hasRetainedMessageContent(message: Message): boolean {
  if (typeof message.content === "string") {
    return message.content.length > 0;
  }

  if (Array.isArray(message.content)) {
    return message.content.length > 0;
  }

  return false;
}

function trimMessageToTokenLimit(
  message: Message,
  maxTokens: number,
  options?: {
    preserveAllNonTextItems?: boolean;
  },
): Message {
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
      if (options?.preserveAllNonTextItems) {
        compactedContent.push(item);
        continue;
      }

      const itemTokens = estimateContentItemTokens(item);
      if (
        remainingTokens <= 0 ||
        itemTokens <= 0 ||
        itemTokens > remainingTokens
      ) {
        continue;
      }

      remainingTokens = Math.max(0, remainingTokens - itemTokens);
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
      remainingTokens - estimateTextTokens(trimmedText),
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
  const mostRecentUserMessageIndex = [...conversationMessages]
    .reverse()
    .findIndex((message) => message.role === "user");
  const resolvedMostRecentUserMessageIndex =
    mostRecentUserMessageIndex >= 0
      ? conversationMessages.length - 1 - mostRecentUserMessageIndex
      : -1;

  for (
    let conversationIndex = conversationMessages.length - 1;
    conversationIndex >= 0;
    conversationIndex -= 1
  ) {
    const message = conversationMessages[conversationIndex];
    const isMostRecentUserMessage =
      conversationIndex === resolvedMostRecentUserMessageIndex;
    const messageTokens = estimateMessageTokens(message);

    if (messageTokens <= remainingTokens) {
      compactedConversation.push(message);
      remainingTokens -= messageTokens;
      continue;
    }

    if (remainingTokens > 0 || isMostRecentUserMessage) {
      const trimmedMessage = trimMessageToTokenLimit(message, remainingTokens, {
        preserveAllNonTextItems: isMostRecentUserMessage,
      });

      if (hasRetainedMessageContent(trimmedMessage)) {
        compactedConversation.push(trimmedMessage);
      }
    }

    if (isMostRecentUserMessage) {
      remainingTokens = 0;
      continue;
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
