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
import {
  BudgetState,
  TaskClass,
  normalizePlanTier,
  resolveModelPolicy,
  type ResolvedModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";
import { compactMessagesToTokenLimit } from "./message-policy";

interface GenerateResponseParams {
  messages: Message[];
  taskId: string;
  userId: string;
  personaId?: string | null;
  planName: PlanName;
  entitlements: Entitlements;
  taskClass?: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
}

interface GenerateStreamingResponseParams extends GenerateResponseParams {
  abortSignal?: AbortSignal;
  onContentChunk?: (delta: string, snapshot: string) => void;
}

export type OpenAIErrorType =
  | "rate_limit"
  | "timeout"
  | "service_error"
  | "policy_blocked"
  | "unknown";

type BlockedReason =
  | "media_limit_reached"
  | "image_disabled"
  | "audio_disabled";

export interface OpenAIResponsePayload {
  taskData?: Message;
  taskUsage?: number;
  generatedImage?: boolean;
  generatedAudio?: boolean;
  blockedReason?: BlockedReason;
  errorType?: OpenAIErrorType;
  errorMessage?: string;
  requestMetrics?: AIRequestMetric[];
}

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
}): OpenAIResponsePayload {
  return {
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
  };
}

function createPolicyBlockedPayload({
  policy,
  requestMetrics,
}: {
  policy: ResolvedModelPolicy;
  requestMetrics: AIRequestMetric[];
}): OpenAIResponsePayload {
  return {
    errorType: "policy_blocked",
    errorMessage:
      policy.notes ??
      "This request is blocked for your current plan or context.",
    requestMetrics,
  };
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

function serializeToolCalls(
  toolCalls:
    | {
        type: string;
        function?: {
          name: string;
          arguments: string;
        };
      }[]
    | undefined,
) {
  return toolCalls?.map((toolCall) => {
    if (toolCall.type === "function" && toolCall.function) {
      return {
        type: toolCall.type,
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        },
      };
    }

    return {
      type: toolCall.type,
    };
  });
}

function resolveFeaturePolicy({
  planName,
  feature,
  taskClass,
  budgetState,
  retryAttempt,
  highLatency,
  explicitPremium,
}: {
  planName: PlanName;
  feature: "chat" | "image_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
}): ResolvedModelPolicy;
function resolveFeaturePolicy({
  planName,
  feature,
  taskClass,
  budgetState,
  retryAttempt,
  highLatency,
  explicitPremium,
  audioMode,
}: {
  planName: PlanName;
  feature: "audio_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode: "tts" | "audio_in_out";
}): ResolvedModelPolicy;
function resolveFeaturePolicy({
  planName,
  feature,
  taskClass,
  budgetState,
  retryAttempt,
  highLatency,
  explicitPremium,
  audioMode,
}: {
  planName: PlanName;
  feature: "chat" | "image_generation" | "audio_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode?: "tts" | "audio_in_out";
}): ResolvedModelPolicy {
  return resolveModelPolicy({
    plan: normalizePlanTier(planName),
    feature,
    taskClass,
    budgetState,
    retryAttempt,
    highLatency,
    explicitPremium,
    audioMode,
  });
}

function maybeAddBlockedMetric({
  requestMetrics,
  policy,
  requestType,
  blockedReason,
}: {
  requestMetrics: AIRequestMetric[];
  policy: ResolvedModelPolicy;
  requestType: AIRequestMetric["requestType"];
  blockedReason: BlockedReason;
}) {
  if (policy.hardBlocked || policy.model === "blocked") {
    return;
  }

  requestMetrics.push({
    requestType,
    model: policy.model,
    blocked: true,
    blockedReason,
    latencyMs: 0,
  });
}

async function buildOpenAIResponsePayload({
  message,
  taskUsage,
  requestMetrics,
  taskId,
  userId,
  planName,
  entitlements,
  selectedPersonaId,
}: {
  message: {
    role: MessageRole;
    content?: string | null;
    tool_calls?: {
      type?: string;
      function?: {
        name?: string;
        arguments?: string | null;
      };
    }[];
  };
  taskUsage: number;
  requestMetrics: AIRequestMetric[];
  taskId: string;
  userId: string;
  planName: PlanName;
  entitlements: Entitlements;
  selectedPersonaId: string;
}): Promise<OpenAIResponsePayload> {
  const selectedPersona = getPersona(selectedPersonaId);
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
      const imagePolicy = resolveFeaturePolicy({
        planName,
        feature: "image_generation",
        taskClass: "final",
      });

      if (
        !entitlements.supportsImageGeneration ||
        !selectedPersona.supportsImage ||
        imagePolicy.hardBlocked
      ) {
        const blockedReason: BlockedReason = entitlements.imageLimitReached
          ? "media_limit_reached"
          : "image_disabled";

        maybeAddBlockedMetric({
          requestMetrics,
          policy: imagePolicy,
          requestType: "image",
          blockedReason,
        });

        return createBlockedResponsePayload({
          message:
            blockedReason === "media_limit_reached"
              ? "Image generation limit reached for your current plan."
              : "Image generation is not enabled for the current plan or persona.",
          taskUsage,
          blockedReason,
          requestMetrics,
        });
      }

      const imageResponse = await generateImage({
        prompt: typeof parsedArgs.prompt === "string" ? parsedArgs.prompt : "",
        role: message.role,
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

      return {
        ...imagePayload,
        taskUsage: taskUsage + (imagePayload.taskUsage ?? 0),
        requestMetrics,
      };
    }

    if (functionName === "getGeneratedAudio") {
      const audioPolicy = resolveFeaturePolicy({
        planName,
        feature: "audio_generation",
        taskClass: "final",
        audioMode: "tts",
      });

      if (
        !entitlements.supportsAudioGeneration ||
        !selectedPersona.supportsAudio ||
        audioPolicy.hardBlocked
      ) {
        const blockedReason: BlockedReason = entitlements.audioLimitReached
          ? "media_limit_reached"
          : "audio_disabled";

        maybeAddBlockedMetric({
          requestMetrics,
          policy: audioPolicy,
          requestType: "audio",
          blockedReason,
        });

        return createBlockedResponsePayload({
          message:
            blockedReason === "media_limit_reached"
              ? "Audio generation limit reached for your current plan."
              : "Audio generation is not enabled for the current plan or persona.",
          taskUsage,
          blockedReason,
          requestMetrics,
        });
      }

      const audioResponse = await generateAudio({
        messages: Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs],
        role: message.role,
        taskId,
        userId,
        planName,
        audioMode: "tts",
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

      return {
        ...audioPayload,
        taskUsage: taskUsage + (audioPayload.taskUsage ?? 0),
        requestMetrics,
      };
    }
  }

  return {
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
    taskUsage,
    generatedImage: false,
    generatedAudio: false,
    requestMetrics,
  };
}

function buildChatCompletionMessages({
  personaId,
  messages,
  maxInputTokens,
}: {
  personaId: string;
  messages: Message[];
  maxInputTokens?: number;
}): ChatCompletionMessageParam[] {
  const preparedMessages = compactMessagesToTokenLimit(
    [...buildPersonaAwareSystemPrompt(personaId), ...messages] as Message[],
    maxInputTokens,
  );

  return preparedMessages as ChatCompletionMessageParam[];
}

async function runChatCompletion({
  messages,
  taskId,
  userId,
  personaId,
  planName,
  entitlements,
  taskClass = "standard",
  budgetState = "normal",
  retryAttempt = 0,
  highLatency = false,
  explicitPremium = false,
  requestMetrics,
}: GenerateResponseParams & {
  requestMetrics: AIRequestMetric[];
}): Promise<OpenAIResponsePayload> {
  const selectedPersona = getPersona(personaId);
  const chatPolicy = resolveFeaturePolicy({
    planName,
    feature: "chat",
    taskClass,
    budgetState,
    retryAttempt,
    highLatency,
    explicitPremium,
  });

  if (chatPolicy.hardBlocked) {
    return createPolicyBlockedPayload({
      policy: chatPolicy,
      requestMetrics,
    });
  }

  const tools = getChatTools({
    supportsImageGeneration: selectedPersona.supportsImage,
    supportsAudioGeneration: selectedPersona.supportsAudio,
  });
  const chatStartTime = Date.now();
  const chatData = await openAiClient.chat.completions.create({
    model: chatPolicy.model,
    temperature: 0.5,
    max_completion_tokens: chatPolicy.maxOutputTokens,
    messages: buildChatCompletionMessages({
      personaId: selectedPersona.id,
      messages,
      maxInputTokens: chatPolicy.maxInputTokens,
    }),
    tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
  });

  requestMetrics.push({
    requestType: "chat",
    model: chatPolicy.model,
    tokensIn: chatData.usage?.prompt_tokens,
    tokensOut: chatData.usage?.completion_tokens,
    latencyMs: Date.now() - chatStartTime,
  });

  if (!chatData?.choices?.length) {
    throw new Error("No valid response from Chat Completion API.");
  }

  const { message } = chatData.choices[0];
  const chatUsage = chatData.usage?.total_tokens ?? 0;

  return buildOpenAIResponsePayload({
    message: {
      role: message.role as MessageRole,
      content: typeof message.content === "string" ? message.content : null,
      tool_calls: serializeToolCalls(message.tool_calls),
    },
    taskUsage: chatUsage,
    requestMetrics,
    taskId,
    userId,
    planName,
    entitlements,
    selectedPersonaId: selectedPersona.id,
  });
}

export async function generateResponse({
  messages,
  taskId,
  userId,
  personaId,
  planName,
  entitlements,
  taskClass = "standard",
  budgetState = "normal",
  retryAttempt = 0,
  highLatency = false,
  explicitPremium = false,
}: GenerateResponseParams) {
  const requestMetrics: AIRequestMetric[] = [];

  try {
    const payload = await runChatCompletion({
      messages,
      taskId,
      userId,
      personaId,
      planName,
      entitlements,
      taskClass,
      budgetState,
      retryAttempt,
      highLatency,
      explicitPremium,
      requestMetrics,
    });

    return JSON.stringify(payload);
  } catch (error) {
    return JSON.stringify({
      errorType: classifyOpenAIError(error),
      requestMetrics,
    } satisfies OpenAIResponsePayload);
  }
}

export async function generateStreamingResponse({
  messages,
  taskId,
  userId,
  personaId,
  planName,
  entitlements,
  taskClass = "standard",
  budgetState = "normal",
  retryAttempt = 0,
  highLatency = false,
  explicitPremium = false,
  abortSignal,
  onContentChunk,
}: GenerateStreamingResponseParams): Promise<OpenAIResponsePayload> {
  const requestMetrics: AIRequestMetric[] = [];

  try {
    const selectedPersona = getPersona(personaId);
    const chatPolicy = resolveFeaturePolicy({
      planName,
      feature: "chat",
      taskClass,
      budgetState,
      retryAttempt,
      highLatency,
      explicitPremium,
    });

    if (chatPolicy.hardBlocked) {
      return createPolicyBlockedPayload({
        policy: chatPolicy,
        requestMetrics,
      });
    }

    const tools = getChatTools({
      supportsImageGeneration: selectedPersona.supportsImage,
      supportsAudioGeneration: selectedPersona.supportsAudio,
    });
    const chatStartTime = Date.now();
    const chatStream = openAiClient.chat.completions.stream(
      {
        model: chatPolicy.model,
        temperature: 0.5,
        max_completion_tokens: chatPolicy.maxOutputTokens,
        messages: buildChatCompletionMessages({
          personaId: selectedPersona.id,
          messages,
          maxInputTokens: chatPolicy.maxInputTokens,
        }),
        tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
      },
      abortSignal ? { signal: abortSignal } : undefined,
    );

    chatStream.on("content", (delta: string, snapshot: string) => {
      if (delta.length > 0) {
        onContentChunk?.(delta, snapshot);
      }
    });

    const chatData = await chatStream.finalChatCompletion();
    const totalUsage = chatData.usage ?? (await chatStream.totalUsage());

    requestMetrics.push({
      requestType: "chat",
      model: chatPolicy.model,
      tokensIn: totalUsage.prompt_tokens,
      tokensOut: totalUsage.completion_tokens,
      latencyMs: Date.now() - chatStartTime,
    });

    if (!chatData?.choices?.length) {
      throw new Error("No valid response from Chat Completion API.");
    }

    const { message } = chatData.choices[0];

    return await buildOpenAIResponsePayload({
      message: {
        role: message.role as MessageRole,
        content: typeof message.content === "string" ? message.content : null,
        tool_calls: serializeToolCalls(message.tool_calls),
      },
      taskUsage: totalUsage.total_tokens,
      requestMetrics,
      taskId,
      userId,
      planName,
      entitlements,
      selectedPersonaId: selectedPersona.id,
    });
  } catch (error) {
    return {
      errorType: classifyOpenAIError(error),
      requestMetrics,
    };
  }
}
