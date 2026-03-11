import {
  buildPersonaAwareSystemPrompt,
  getPersona,
} from "@/constants/assistant-personas";
import { getChatTools, openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { ContentItem, Message, MessageRole } from "@/types";
import { generateImage } from "./generateImage";
import { generateAudio } from "./generateAudio";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { Entitlements } from "@/lib/utils/resolve-entitlements";
import { APIError } from "openai";
import { resolveModelForPlan } from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";

interface GenerateResponseParams {
  messages: Message[];
  taskId: string;
  userId: string;
  personaId?: string | null;
  planName: PlanName;
  entitlements: Entitlements;
}

export type OpenAIErrorType =
  | "rate_limit"
  | "timeout"
  | "service_error"
  | "unknown";

type BlockedReason =
  | "media_limit_reached"
  | "image_disabled"
  | "audio_disabled";

function createBlockedResponsePayload({
  message,
  taskUsage,
  blockedReason,
  requestMetrics,
}: {
  message: string;
  taskUsage: number;
  blockedReason: BlockedReason;
  requestMetrics: AIRequestMetric[];
}) {
  return JSON.stringify({
    taskData: {
      whois: "assistant",
      role: "assistant",
      content: [
        {
          type: "text",
          text: message,
        },
      ] as ContentItem[],
    },
    taskUsage,
    blockedReason,
    requestMetrics,
  });
}

function classifyOpenAIError(error: unknown): OpenAIErrorType {
  if (error instanceof APIError) {
    const status = error.status ?? 0;

    if (status === 429) {
      return "rate_limit";
    }

    if (status === 408 || status === 504) {
      return "timeout";
    }

    if ([500, 502, 503].includes(status)) {
      return "service_error";
    }
  }

  return "unknown";
}

export async function generateResponse({
  messages,
  taskId,
  userId,
  personaId,
  planName,
  entitlements,
}: GenerateResponseParams) {
  const requestMetrics: AIRequestMetric[] = [];

  try {
    const selectedPersona = getPersona(personaId);
    const chatModel = resolveModelForPlan(planName, "chat");

    if (!chatModel) {
      throw new Error("No chat model configured for the current plan.");
    }

    const tools = getChatTools({
      supportsImageGeneration: selectedPersona.supportsImage,
      supportsAudioGeneration: selectedPersona.supportsAudio,
    });
    const chatStartTime = Date.now();
    const chatData = await openAiClient.chat.completions.create({
      model: chatModel,
      temperature: 0.5,
      messages: [
        ...buildPersonaAwareSystemPrompt(selectedPersona.id),
        ...messages,
      ] as ChatCompletionMessageParam[],
      tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
    });

    requestMetrics.push({
      requestType: "chat",
      model: chatModel,
      tokensIn: chatData.usage?.prompt_tokens,
      tokensOut: chatData.usage?.completion_tokens,
      latencyMs: Date.now() - chatStartTime,
    });

    if (!chatData?.choices?.length) {
      throw new Error("No valid response from Chat Completion API.");
    }

    const { message } = chatData.choices[0];
    const toolCall = message.tool_calls?.[0];
    const chatUsage = chatData.usage?.total_tokens ?? 0;

    if (toolCall && toolCall.type === "function" && toolCall.function) {
      const functionName = toolCall.function.name;
      const argsStr = toolCall.function.arguments ?? "{}";
      const parsedArgs = (() => {
        try {
          return JSON.parse(argsStr);
        } catch {
          return {};
        }
      })();

      if (functionName === "getGeneratedImage") {
        const imageModel = resolveModelForPlan(planName, "image");

        if (
          !entitlements.supportsImageGeneration ||
          !selectedPersona.supportsImage
        ) {
          const blockedReason: BlockedReason = entitlements.imageLimitReached
            ? "media_limit_reached"
            : "image_disabled";

          if (imageModel) {
            requestMetrics.push({
              requestType: "image",
              model: imageModel,
              blocked: true,
              blockedReason,
              latencyMs: 0,
            });
          }

          return createBlockedResponsePayload({
            message:
              blockedReason === "media_limit_reached"
                ? "Image generation limit reached for your current plan."
                : "Image generation is not enabled for the current plan or persona.",
            taskUsage: chatUsage,
            blockedReason,
            requestMetrics,
          });
        }

        const imageResponse = await generateImage({
          prompt:
            typeof parsedArgs.prompt === "string" ? parsedArgs.prompt : "",
          role: message.role as MessageRole,
          taskId,
          userId,
          planName,
        });
        const imagePayload = JSON.parse(imageResponse as string) as {
          taskData?: Message;
          taskUsage?: number;
          generatedImage?: boolean;
          requestMetric?: AIRequestMetric;
        };

        if (imagePayload.requestMetric) {
          requestMetrics.push(imagePayload.requestMetric);
        }

        return JSON.stringify({
          ...imagePayload,
          taskUsage: chatUsage + (imagePayload.taskUsage ?? 0),
          requestMetrics,
        });
      }

      if (functionName === "getGeneratedAudio") {
        const audioModel = resolveModelForPlan(planName, "audio");

        if (
          !entitlements.supportsAudioGeneration ||
          !selectedPersona.supportsAudio
        ) {
          const blockedReason: BlockedReason = entitlements.audioLimitReached
            ? "media_limit_reached"
            : "audio_disabled";

          if (audioModel) {
            requestMetrics.push({
              requestType: "audio",
              model: audioModel,
              blocked: true,
              blockedReason,
              latencyMs: 0,
            });
          }

          return createBlockedResponsePayload({
            message:
              blockedReason === "media_limit_reached"
                ? "Audio generation limit reached for your current plan."
                : "Audio generation is not enabled for the current plan or persona.",
            taskUsage: chatUsage,
            blockedReason,
            requestMetrics,
          });
        }

        const audioResponse = await generateAudio({
          messages: Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs],
          role: message.role as MessageRole,
          taskId,
          userId,
          planName,
        });
        const audioPayload = JSON.parse(audioResponse as string) as {
          taskData?: Message;
          taskUsage?: number;
          generatedAudio?: boolean;
          requestMetric?: AIRequestMetric;
        };

        if (audioPayload.requestMetric) {
          requestMetrics.push(audioPayload.requestMetric);
        }

        return JSON.stringify({
          ...audioPayload,
          taskUsage: chatUsage + (audioPayload.taskUsage ?? 0),
          requestMetrics,
        });
      }
    }

    return JSON.stringify({
      taskData: {
        whois: message.role,
        role: message.role,
        content: [
          {
            type: "text",
            text: typeof message.content === "string" ? message.content : "",
          },
        ] as ContentItem[],
      },
      taskUsage: chatUsage,
      generatedImage: false,
      generatedAudio: false,
      requestMetrics,
    });
  } catch (error) {
    return JSON.stringify({
      errorType: classifyOpenAIError(error),
      requestMetrics,
    });
  }
}
