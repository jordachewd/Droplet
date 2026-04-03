import "server-only";
import { getPersona } from "@/constants/assistant-personas";
import {
  buildPersonaAwareSystemPrompt,
  resolvePersonaPromptConfig,
} from "@/constants/persona-prompts";
import { getChatTools, openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { ContentItem, Message, MessageRole } from "@/types";
import { generateImage } from "./generateImage";
import { generateAudio } from "./generateAudio";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Entitlements } from "@/lib/utils/resolve-entitlements";
import { APIError } from "openai";
import {
  BudgetState,
  ModelPolicyModelOverrides,
  TaskClass,
  normalizePlanTier,
  resolveModelPolicy,
  type ResolvedModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";
import { compactMessagesToTokenLimit } from "./message-policy";
import { awsS3Client } from "@/constants/aws";
import { resolveS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";

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
  modelOverrides?: ModelPolicyModelOverrides;
  claimMediaGenerationSlot?: (params: {
    limitType: "images" | "audio";
  }) => Promise<{ claimed: boolean }>;
  rollbackMediaGenerationSlot?: (params: {
    limitType: "images" | "audio";
  }) => Promise<void>;
}

interface GenerateStreamingResponseParams extends GenerateResponseParams {
  abortSignal?: AbortSignal;
  onContentChunk?: (delta: string, snapshot: string) => void;
  onMediaGenerationStart?: () => void;
  onMediaGenerationEnd?: () => void;
}

export type OpenAIErrorType =
  | "rate_limit"
  | "timeout"
  | "service_error"
  | "policy_blocked"
  | "unknown";

type BlockedReason =
  | "media_limit_reached"
  | "image_limit_reached"
  | "audio_limit_reached"
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

const MAX_OPENAI_RETRIES = 3;
const OPENAI_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const VISION_PRESIGNED_URL_TTL_SECONDS = 15 * 60;
const INTERNAL_DOWNLOAD_ROUTE_PATH = "/api/download";

function getOpenAIErrorStatus(error: unknown): number | null {
  if (!(error instanceof APIError)) {
    return null;
  }

  return error.status ?? null;
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
  const status = getOpenAIErrorStatus(error);

  if (status === 429) {
    return "rate_limit";
  }

  if (status === 408 || status === 504) {
    return "timeout";
  }

  if ([500, 502, 503].includes(status ?? 0)) {
    return "service_error";
  }

  return "unknown";
}

function isRetryableOpenAIError(error: unknown): boolean {
  const status = getOpenAIErrorStatus(error);

  if (status === null || [400, 401, 403].includes(status)) {
    return false;
  }

  return [429, 500, 502, 503].includes(status);
}

async function waitForRetry(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function logOpenAIRetry({
  error,
  operation,
  retryNumber,
  delayMs,
  nextModel,
}: {
  error: unknown;
  operation: "chat" | "stream";
  retryNumber: number;
  delayMs: number;
  nextModel: string;
}) {
  const status = getOpenAIErrorStatus(error);
  const normalizedStatus = status === null ? "unknown" : String(status);

  process.stderr.write(
    `[openai-retry] ${operation} retry ${retryNumber}/${MAX_OPENAI_RETRIES} in ${delayMs}ms after status ${normalizedStatus}; next model=${nextModel}\n`,
  );
}

async function withOpenAIRetry<T>({
  baseRetryAttempt = 0,
  operation,
  resolveNextModel,
  shouldRetry,
  execute,
}: {
  baseRetryAttempt?: number;
  operation: "chat" | "stream";
  resolveNextModel: (nextRetryAttempt: number) => string;
  shouldRetry?: (error: unknown) => boolean;
  execute: (retryAttempt: number) => Promise<T>;
}): Promise<T> {
  let lastError: unknown;

  for (let retryIndex = 0; retryIndex <= MAX_OPENAI_RETRIES; retryIndex += 1) {
    const currentRetryAttempt = baseRetryAttempt + retryIndex;

    try {
      return await execute(currentRetryAttempt);
    } catch (error) {
      lastError = error;

      const canRetry =
        retryIndex < MAX_OPENAI_RETRIES &&
        isRetryableOpenAIError(error) &&
        (shouldRetry?.(error) ?? true);

      if (!canRetry) {
        throw error;
      }

      const delayMs = OPENAI_RETRY_DELAYS_MS[retryIndex];
      const nextRetryAttempt = currentRetryAttempt + 1;

      logOpenAIRetry({
        error,
        operation,
        retryNumber: retryIndex + 1,
        delayMs,
        nextModel: resolveNextModel(nextRetryAttempt),
      });

      await waitForRetry(delayMs);
    }
  }

  throw lastError ?? new Error("OpenAI request failed.");
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

function isInternalDownloadKeyUrl(rawUrl: string): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(rawUrl, "https://droplet.local");
    return (
      parsedUrl.pathname === INTERNAL_DOWNLOAD_ROUTE_PATH &&
      parsedUrl.searchParams.has("key")
    );
  } catch {
    return false;
  }
}

async function buildVisionPresignedUrl(
  objectKey: string,
): Promise<string | null> {
  const bucketName = process.env.AWS_S3_BUCKET?.trim();

  if (!bucketName) {
    process.stderr.write(
      "[generateResponse] Failed to build vision pre-signed URL: missing AWS_S3_BUCKET\n",
    );
    return null;
  }

  try {
    return await getSignedUrl(
      awsS3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
      {
        expiresIn: VISION_PRESIGNED_URL_TTL_SECONDS,
      },
    );
  } catch (error) {
    process.stderr.write(
      `[generateResponse] Failed to build vision pre-signed URL for objectKey=${objectKey}: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
    return null;
  }
}

async function resolveImageInputUrlsForOpenAI(
  messages: Message[],
): Promise<Message[]> {
  let hasChanges = false;

  const transformedMessages: Message[] = [];

  for (const message of messages) {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      transformedMessages.push(message);
      continue;
    }

    let messageChanged = false;
    const transformedContent: ContentItem[] = [];

    for (const item of message.content) {
      if (
        item.type !== "image_url" ||
        typeof item.image_url?.url !== "string"
      ) {
        transformedContent.push(item);
        continue;
      }

      const imageUrl = item.image_url.url;

      if (!isInternalDownloadKeyUrl(imageUrl)) {
        transformedContent.push(item);
        continue;
      }

      const objectKey = resolveS3ObjectKey(imageUrl);

      if (!objectKey) {
        transformedContent.push(item);
        continue;
      }

      const presignedUrl = await buildVisionPresignedUrl(objectKey);

      if (!presignedUrl) {
        transformedContent.push(item);
        continue;
      }

      messageChanged = true;
      hasChanges = true;

      transformedContent.push({
        ...item,
        image_url: {
          url: presignedUrl,
        },
      });
    }

    transformedMessages.push(
      messageChanged ? { ...message, content: transformedContent } : message,
    );
  }

  return hasChanges ? transformedMessages : messages;
}

function resolveFeaturePolicy({
  planName,
  feature,
  taskClass,
  budgetState,
  retryAttempt,
  highLatency,
  explicitPremium,
  modelOverrides,
}: {
  planName: PlanName;
  feature: "chat" | "image_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  modelOverrides?: ModelPolicyModelOverrides;
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
  modelOverrides,
}: {
  planName: PlanName;
  feature: "audio_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode: "tts" | "audio_in_out";
  modelOverrides?: ModelPolicyModelOverrides;
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
  modelOverrides,
}: {
  planName: PlanName;
  feature: "chat" | "image_generation" | "audio_generation";
  taskClass: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode?: "tts" | "audio_in_out";
  modelOverrides?: ModelPolicyModelOverrides;
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
    modelOverrides,
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
  modelOverrides,
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
  onMediaGenerationStart,
  onMediaGenerationEnd,
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
  modelOverrides?: ModelPolicyModelOverrides;
  claimMediaGenerationSlot?: (params: {
    limitType: "images" | "audio";
  }) => Promise<{ claimed: boolean }>;
  rollbackMediaGenerationSlot?: (params: {
    limitType: "images" | "audio";
  }) => Promise<void>;
  onMediaGenerationStart?: () => void;
  onMediaGenerationEnd?: () => void;
}): Promise<OpenAIResponsePayload> {
  const toolCall = message.tool_calls?.[0];

  if (toolCall && toolCall.type === "function" && toolCall.function) {
    const functionName = toolCall.function.name;
    const argsStr = toolCall.function.arguments ?? "{}";
    const parsedArgs = (() => {
      try {
        return JSON.parse(argsStr);
      } catch (error) {
        process.stderr.write(
          `[generateResponse] Failed to parse tool arguments: ${error instanceof Error ? error.message : "unknown"}\n`,
        );
        return {};
      }
    })();

    if (functionName === "getGeneratedImage") {
      const imagePolicy = resolveFeaturePolicy({
        planName,
        feature: "image_generation",
        taskClass: "final",
        modelOverrides,
      });

      if (!entitlements.supportsImageGeneration || imagePolicy.hardBlocked) {
        const blockedReason: BlockedReason = entitlements.imageLimitReached
          ? "image_limit_reached"
          : "image_disabled";

        maybeAddBlockedMetric({
          requestMetrics,
          policy: imagePolicy,
          requestType: "image",
          blockedReason,
        });

        return createBlockedResponsePayload({
          message:
            blockedReason === "image_limit_reached"
              ? "Image generation limit reached for your current plan."
              : "Image generation is not enabled for the current plan.",
          taskUsage,
          blockedReason,
          requestMetrics,
        });
      }

      let imageSlotClaimed = false;

      if (claimMediaGenerationSlot) {
        const claimResult = await claimMediaGenerationSlot({
          limitType: "images",
        });

        if (!claimResult.claimed) {
          maybeAddBlockedMetric({
            requestMetrics,
            policy: imagePolicy,
            requestType: "image",
            blockedReason: "image_limit_reached",
          });

          return createBlockedResponsePayload({
            message: "Image generation limit reached for your current plan.",
            taskUsage,
            blockedReason: "image_limit_reached",
            requestMetrics,
          });
        }

        imageSlotClaimed = true;
      }

      let didStartMediaGeneration = false;
      try {
        if (onMediaGenerationStart) {
          onMediaGenerationStart();
          didStartMediaGeneration = true;
        }

        const imagePayload = await generateImage({
          prompt:
            typeof parsedArgs.prompt === "string" ? parsedArgs.prompt : "",
          role: message.role,
          taskId,
          userId,
          planName,
          modelOverrides,
        });

        if (imagePayload.requestMetric) {
          requestMetrics.push(imagePayload.requestMetric);
        }

        return {
          ...imagePayload,
          taskUsage,
          requestMetrics,
        };
      } catch (imageError) {
        if (imageSlotClaimed && rollbackMediaGenerationSlot) {
          try {
            await rollbackMediaGenerationSlot({
              limitType: "images",
            });
          } catch (rollbackError) {
            process.stderr.write(
              `[generateResponse] image slot rollback failed: ${rollbackError instanceof Error ? rollbackError.message : "unknown"}\n`,
            );
          }
        }

        const status =
          imageError instanceof Error && "status" in imageError
            ? (imageError as { status?: number }).status
            : undefined;
        process.stderr.write(
          `[generateResponse] image generation failed model=${imagePolicy.model} status=${status ?? "unknown"}\n`,
        );
        return {
          errorType: "service_error",
          errorMessage: "Image generation failed. Please try again.",
          requestMetrics,
        };
      } finally {
        if (didStartMediaGeneration) {
          onMediaGenerationEnd?.();
        }
      }
    }

    if (functionName === "getGeneratedAudio") {
      const audioPolicy = resolveFeaturePolicy({
        planName,
        feature: "audio_generation",
        taskClass: "final",
        audioMode: "tts",
        modelOverrides,
      });

      if (!entitlements.supportsAudioGeneration || audioPolicy.hardBlocked) {
        const blockedReason: BlockedReason = entitlements.audioLimitReached
          ? "audio_limit_reached"
          : "audio_disabled";

        maybeAddBlockedMetric({
          requestMetrics,
          policy: audioPolicy,
          requestType: "audio",
          blockedReason,
        });

        return createBlockedResponsePayload({
          message:
            blockedReason === "audio_limit_reached"
              ? "Audio generation limit reached for your current plan."
              : "Audio generation is not enabled for the current plan.",
          taskUsage,
          blockedReason,
          requestMetrics,
        });
      }

      let audioSlotClaimed = false;

      if (claimMediaGenerationSlot) {
        const claimResult = await claimMediaGenerationSlot({
          limitType: "audio",
        });

        if (!claimResult.claimed) {
          maybeAddBlockedMetric({
            requestMetrics,
            policy: audioPolicy,
            requestType: "audio",
            blockedReason: "audio_limit_reached",
          });

          return createBlockedResponsePayload({
            message: "Audio generation limit reached for your current plan.",
            taskUsage,
            blockedReason: "audio_limit_reached",
            requestMetrics,
          });
        }

        audioSlotClaimed = true;
      }

      let didStartMediaGeneration = false;
      try {
        if (onMediaGenerationStart) {
          onMediaGenerationStart();
          didStartMediaGeneration = true;
        }

        const ttsText =
          typeof parsedArgs.content === "string" ? parsedArgs.content : "";

        const audioPayload = await generateAudio({
          ttsText,
          role: message.role,
          taskId,
          userId,
          planName,
          audioMode: "tts",
          modelOverrides,
        });

        if (audioPayload.requestMetric) {
          requestMetrics.push(audioPayload.requestMetric);
        }

        return {
          ...audioPayload,
          taskUsage: taskUsage + (audioPayload.taskUsage ?? 0),
          requestMetrics,
        };
      } catch (audioError) {
        if (audioSlotClaimed && rollbackMediaGenerationSlot) {
          try {
            await rollbackMediaGenerationSlot({
              limitType: "audio",
            });
          } catch (rollbackError) {
            process.stderr.write(
              `[generateResponse] audio slot rollback failed: ${rollbackError instanceof Error ? rollbackError.message : "unknown"}\n`,
            );
          }
        }

        const status =
          audioError instanceof Error && "status" in audioError
            ? (audioError as { status?: number }).status
            : undefined;
        process.stderr.write(
          `[generateResponse] audio generation failed model=${audioPolicy.model} status=${status ?? "unknown"}\n`,
        );
        return {
          errorType: "service_error",
          errorMessage: "Audio generation failed. Please try again.",
          requestMetrics,
        };
      } finally {
        if (didStartMediaGeneration) {
          onMediaGenerationEnd?.();
        }
      }
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

function buildChatCompletionRequestSettings({
  personaId,
  model,
  messages,
  maxInputTokens,
  maxOutputTokens,
}: {
  personaId: string;
  model: string;
  messages: Message[];
  maxInputTokens?: number;
  maxOutputTokens?: number;
}): {
  messages: ChatCompletionMessageParam[];
  temperature: number;
  maxCompletionTokens?: number;
} {
  const promptConfig = resolvePersonaPromptConfig({
    personaId,
    model,
  });
  const preparedMessages = compactMessagesToTokenLimit(
    [
      ...buildPersonaAwareSystemPrompt(personaId, {
        model,
      }),
      ...messages,
    ] as Message[],
    maxInputTokens,
  );
  const maxCompletionTokens =
    typeof maxOutputTokens === "number" &&
    typeof promptConfig.maxTokens === "number"
      ? Math.min(maxOutputTokens, promptConfig.maxTokens)
      : (maxOutputTokens ?? promptConfig.maxTokens);

  return {
    messages: preparedMessages as ChatCompletionMessageParam[],
    temperature: promptConfig.temperature,
    maxCompletionTokens,
  };
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
  modelOverrides,
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
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
    modelOverrides,
  });

  if (chatPolicy.hardBlocked) {
    return createPolicyBlockedPayload({
      policy: chatPolicy,
      requestMetrics,
    });
  }

  const tools = getChatTools({
    supportsImageGeneration: entitlements.supportsImageGeneration,
    supportsAudioGeneration: entitlements.supportsAudioGeneration,
  });
  const chatRequestSettings = buildChatCompletionRequestSettings({
    personaId: selectedPersona.id,
    model: chatPolicy.model,
    messages,
    maxInputTokens: chatPolicy.maxInputTokens,
    maxOutputTokens: chatPolicy.maxOutputTokens,
  });
  const chatStartTime = Date.now();
  const chatData = await openAiClient.chat.completions.create(
    {
      model: chatPolicy.model,
      temperature: chatRequestSettings.temperature,
      max_completion_tokens: chatRequestSettings.maxCompletionTokens,
      messages: chatRequestSettings.messages,
      tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
    },
    {
      maxRetries: 0,
    },
  );

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
    modelOverrides,
    claimMediaGenerationSlot,
    rollbackMediaGenerationSlot,
  });
}

async function runStreamingChatCompletion({
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
  modelOverrides,
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
  abortSignal,
  onContentChunk,
  onMediaGenerationStart,
  onMediaGenerationEnd,
  requestMetrics,
}: GenerateStreamingResponseParams & {
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
    modelOverrides,
  });

  if (chatPolicy.hardBlocked) {
    return createPolicyBlockedPayload({
      policy: chatPolicy,
      requestMetrics,
    });
  }

  const tools = getChatTools({
    supportsImageGeneration: entitlements.supportsImageGeneration,
    supportsAudioGeneration: entitlements.supportsAudioGeneration,
  });
  const chatRequestSettings = buildChatCompletionRequestSettings({
    personaId: selectedPersona.id,
    model: chatPolicy.model,
    messages,
    maxInputTokens: chatPolicy.maxInputTokens,
    maxOutputTokens: chatPolicy.maxOutputTokens,
  });
  const chatStartTime = Date.now();
  const chatStream = openAiClient.chat.completions.stream(
    {
      model: chatPolicy.model,
      temperature: chatRequestSettings.temperature,
      max_completion_tokens: chatRequestSettings.maxCompletionTokens,
      messages: chatRequestSettings.messages,
      tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
    },
    {
      maxRetries: 0,
      signal: abortSignal,
    },
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
    modelOverrides,
    claimMediaGenerationSlot,
    rollbackMediaGenerationSlot,
    onMediaGenerationStart,
    onMediaGenerationEnd,
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
  modelOverrides,
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
}: GenerateResponseParams): Promise<OpenAIResponsePayload> {
  const requestMetrics: AIRequestMetric[] = [];

  try {
    const resolvedMessages = await resolveImageInputUrlsForOpenAI(messages);
    const payload = await withOpenAIRetry({
      baseRetryAttempt: retryAttempt,
      operation: "chat",
      resolveNextModel: (nextRetryAttempt) =>
        resolveFeaturePolicy({
          planName,
          feature: "chat",
          taskClass,
          budgetState,
          retryAttempt: nextRetryAttempt,
          highLatency,
          explicitPremium,
          modelOverrides,
        }).model,
      execute: (resolvedRetryAttempt) =>
        runChatCompletion({
          messages: resolvedMessages,
          taskId,
          userId,
          personaId,
          planName,
          entitlements,
          taskClass,
          budgetState,
          retryAttempt: resolvedRetryAttempt,
          highLatency,
          explicitPremium,
          modelOverrides,
          claimMediaGenerationSlot,
          rollbackMediaGenerationSlot,
          requestMetrics,
        }),
    });

    return payload;
  } catch (error) {
    return {
      errorType: classifyOpenAIError(error),
      requestMetrics,
    };
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
  modelOverrides,
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
  abortSignal,
  onContentChunk,
  onMediaGenerationStart,
  onMediaGenerationEnd,
}: GenerateStreamingResponseParams): Promise<OpenAIResponsePayload> {
  const requestMetrics: AIRequestMetric[] = [];
  let didEmitContent = false;

  try {
    const resolvedMessages = await resolveImageInputUrlsForOpenAI(messages);
    return await withOpenAIRetry({
      baseRetryAttempt: retryAttempt,
      operation: "stream",
      resolveNextModel: (nextRetryAttempt) =>
        resolveFeaturePolicy({
          planName,
          feature: "chat",
          taskClass,
          budgetState,
          retryAttempt: nextRetryAttempt,
          highLatency,
          explicitPremium,
          modelOverrides,
        }).model,
      shouldRetry: () => !didEmitContent,
      execute: (resolvedRetryAttempt) =>
        runStreamingChatCompletion({
          messages: resolvedMessages,
          taskId,
          userId,
          personaId,
          planName,
          entitlements,
          taskClass,
          budgetState,
          retryAttempt: resolvedRetryAttempt,
          highLatency,
          explicitPremium,
          modelOverrides,
          claimMediaGenerationSlot,
          rollbackMediaGenerationSlot,
          abortSignal,
          onContentChunk: (delta, snapshot) => {
            didEmitContent = true;
            onContentChunk?.(delta, snapshot);
          },
          onMediaGenerationStart,
          onMediaGenerationEnd,
          requestMetrics,
        }),
    });
  } catch (error) {
    return {
      errorType: classifyOpenAIError(error),
      requestMetrics,
    };
  }
}
