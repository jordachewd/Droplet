import {
  buildPersonaAwareSystemPrompt,
  getPersona,
} from "@/constants/assistant-personas";
import { getChatTools, openAiClient } from "@/constants/openai";
import { ContentItem, Message, MessageRole } from "@/types";
import { generateImage } from "./generateImage";
import { generateAudio } from "./generateAudio";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { Entitlements } from "@/lib/utils/resolve-entitlements";
import { APIError } from "openai";

interface GenerateResponseParams {
  messages: Message[];
  taskId: string;
  userId: string;
  personaId?: string | null;
  entitlements: Entitlements;
}

export type OpenAIErrorType =
  | "rate_limit"
  | "timeout"
  | "service_error"
  | "unknown";

type BlockedReason =
  | "image_limit"
  | "audio_limit"
  | "image_disabled"
  | "audio_disabled";

function createBlockedResponsePayload({
  message,
  taskUsage,
  blockedReason,
}: {
  message: string;
  taskUsage: number;
  blockedReason: BlockedReason;
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
  });
}

export async function generateResponse({
  messages,
  taskId,
  userId,
  personaId,
  entitlements,
}: GenerateResponseParams) {
  try {
    const selectedPersona = getPersona(personaId);
    const tools = getChatTools({
      supportsImageGeneration:
        entitlements.supportsImageGeneration && selectedPersona.supportsImage,
      supportsAudioGeneration:
        entitlements.supportsAudioGeneration && selectedPersona.supportsAudio,
    });

    const chatData = await openAiClient.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      messages: [
        ...buildPersonaAwareSystemPrompt(selectedPersona.id),
        ...messages,
      ] as ChatCompletionMessageParam[],
      tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
    });

    if (!chatData?.choices?.length) {
      throw new Error("No valid response from Chat Completion API.");
    }

    const { message } = chatData.choices[0];
    const toolCall = message.tool_calls?.[0];

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
        if (
          !entitlements.supportsImageGeneration ||
          !selectedPersona.supportsImage
        ) {
          const isImageLimitReached =
            entitlements.imageLimitReached && selectedPersona.supportsImage;

          return createBlockedResponsePayload({
            message: isImageLimitReached
              ? "Image generation limit reached for your current plan."
              : "Image generation is not enabled for the current plan or persona.",
            taskUsage: chatData.usage?.total_tokens ?? 0,
            blockedReason: isImageLimitReached
              ? "image_limit"
              : "image_disabled",
          });
        }

        return await generateImage({
          prompt:
            typeof parsedArgs.prompt === "string" ? parsedArgs.prompt : "",
          role: message.role as MessageRole,
          taskId,
          userId,
        });
      }

      if (functionName === "getGeneratedAudio") {
        if (
          !entitlements.supportsAudioGeneration ||
          !selectedPersona.supportsAudio
        ) {
          const isAudioLimitReached =
            entitlements.audioLimitReached && selectedPersona.supportsAudio;

          return createBlockedResponsePayload({
            message: isAudioLimitReached
              ? "Audio generation limit reached for your current plan."
              : "Audio generation is not enabled for the current plan or persona.",
            taskUsage: chatData.usage?.total_tokens ?? 0,
            blockedReason: isAudioLimitReached
              ? "audio_limit"
              : "audio_disabled",
          });
        }

        return await generateAudio({
          messages: Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs],
          role: message.role as MessageRole,
          taskId,
          userId,
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
      taskUsage: chatData.usage?.total_tokens ?? 0,
      generatedImage: false,
      generatedAudio: false,
    });
  } catch (error) {
    if (error instanceof APIError) {
      const status = error.status ?? 0;

      if (status === 429) {
        return JSON.stringify({ errorType: "rate_limit" as OpenAIErrorType });
      }

      if (status === 408 || status === 504) {
        return JSON.stringify({ errorType: "timeout" as OpenAIErrorType });
      }

      if ([500, 502, 503].includes(status)) {
        return JSON.stringify({
          errorType: "service_error" as OpenAIErrorType,
        });
      }
    }

    return JSON.stringify({ errorType: "unknown" as OpenAIErrorType });
  }
}
