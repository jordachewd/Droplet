import "server-only";

import { Message } from "@/types";
import { TaskClass } from "@/lib/utils/ai-model-policy";

export type ChatTaskClass = Extract<
  TaskClass,
  "simple" | "standard" | "complex"
>;

const SIMPLE_PROMPT_PATTERN =
  /^(hi|hello|hey|thanks|thank you|what is\b|who is\b|when is\b|where is\b|why is\b|help me\b|summarize\b|translate\b|tell me\b)/i;
const EXPLICIT_DEEP_ANALYSIS_PATTERN =
  /\b(deep(?:ly)? analy[sz]e|deep analysis|deep dive|in[- ]depth|step[- ]by[- ]step(?: reasoning| analysis)?|reason carefully|root cause analysis|trade[- ]offs|security review|performance audit|technical design|architecture review|thorough breakdown|detailed breakdown)\b/i;
const ANALYTICAL_KEYWORDS = [
  "algorithm",
  "analysis",
  "architecture",
  "bug",
  "compare",
  "concurrency",
  "database",
  "debug",
  "failure",
  "implementation",
  "incident",
  "integration",
  "migration",
  "optimize",
  "performance",
  "query",
  "refactor",
  "schema",
  "security",
  "technical",
  "test",
  "trade-off",
  "tradeoff",
  "typescript",
];

function extractMessageText(message?: Message | null): string {
  if (!message?.content) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  return message.content
    .filter(
      (contentItem) =>
        contentItem.type === "text" && typeof contentItem.text === "string",
    )
    .map((contentItem) => contentItem.text?.trim())
    .filter((text): text is string => Boolean(text))
    .join(" ")
    .trim();
}

function countConversationTurns(messages: Message[]): number {
  return messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  ).length;
}

function countAnalyticalKeywordHits(latestMessageText: string): number {
  const normalizedText = latestMessageText.toLowerCase();

  return ANALYTICAL_KEYWORDS.reduce((count, keyword) => {
    return normalizedText.includes(keyword) ? count + 1 : count;
  }, 0);
}

export function isExplicitDeepAnalysisRequest(
  latestUserMessage?: Message | null,
): boolean {
  const latestMessageText = extractMessageText(latestUserMessage);

  return (
    latestMessageText.length > 0 &&
    EXPLICIT_DEEP_ANALYSIS_PATTERN.test(latestMessageText)
  );
}

export function classifyTaskComplexity({
  messages,
  latestUserMessage,
}: {
  messages: Message[];
  latestUserMessage?: Message | null;
}): ChatTaskClass {
  const resolvedLatestMessage = latestUserMessage ?? messages.at(-1) ?? null;
  const latestMessageText = extractMessageText(resolvedLatestMessage);

  if (!latestMessageText) {
    return "standard";
  }

  if (isExplicitDeepAnalysisRequest(resolvedLatestMessage)) {
    return "complex";
  }

  const conversationTurns = countConversationTurns(messages);
  const keywordHits = countAnalyticalKeywordHits(latestMessageText);
  const hasModeratelyLongPrompt = latestMessageText.length >= 220;
  const hasVeryLongPrompt = latestMessageText.length >= 500;
  const hasDeepHistory = conversationTurns >= 10;
  const hasModerateHistory = conversationTurns >= 6;

  if (hasVeryLongPrompt || hasDeepHistory) {
    return "complex";
  }

  if (keywordHits >= 3 && (hasModeratelyLongPrompt || hasModerateHistory)) {
    return "complex";
  }

  const isSimplePrompt =
    conversationTurns <= 2 &&
    latestMessageText.length <= 80 &&
    keywordHits <= 1 &&
    SIMPLE_PROMPT_PATTERN.test(latestMessageText);

  return isSimplePrompt ? "simple" : "standard";
}
