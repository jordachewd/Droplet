import { NextResponse } from "next/server";
import { Message, Messages } from "@/types";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import {
  TaskEndAction,
  TaskEndedReason,
  TaskStatus,
  UpdateTaskParams,
} from "@/types/TaskData.d";
import {
  createTask,
  incrementPromptCountIfBelowLimit,
  updateTask,
} from "@/lib/actions/task.actions";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { UserData } from "@/types/UserData.d";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";
import { getPersona } from "@/constants/assistant-personas";
import User from "@/lib/database/models/user.model";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";
import type {
  OpenAIErrorType,
  OpenAIResponsePayload,
} from "@/lib/utils/openai/generateResponse";
import {
  classifyTaskComplexity,
  isExplicitDeepAnalysisRequest,
} from "@/lib/utils/openai/classify-task-complexity";
import {
  checkDailyConversationLimit,
  claimDailyConversationSlot,
} from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import {
  ensureMessageHasId,
  ensureMessagesHaveId,
} from "@/lib/utils/message-id";
import { PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import {
  BudgetState,
  ModelPolicyModelOverrides,
  TaskClass,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { emitUsageEvents } from "@/lib/utils/usage-event-utils";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectiveModelConfig } from "@/lib/utils/effective-model-config";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";
import {
  chatMessageArraySchema,
  nonEmptyStringSchema,
} from "@/lib/utils/validation-schemas";
import type { ChatApiResponse, ChatStreamEvent } from "@/types/chat-api";
import { z } from "zod";

export const maxDuration = 60;

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;
const TASK_STORAGE_WARNING_BYTES = 12 * 1024 * 1024;
const DEFAULT_CHAT_TASK_CLASS: TaskClass = "standard";
const DEFAULT_CHAT_BUDGET_STATE: BudgetState = "normal";
const STREAM_GENERAL_HEARTBEAT_INTERVAL_MS = 30_000;
const STREAM_MEDIA_HEARTBEAT_INTERVAL_MS = 12_000;
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
} as const;
const streamEncoder = new TextEncoder();

const OPENAI_ERROR_STATUS_MAP: Record<OpenAIErrorType, number> = {
  rate_limit: 429,
  timeout: 504,
  service_error: 502,
  policy_blocked: 403,
  unknown: 500,
};

const OPENAI_ERROR_MESSAGES: Record<OpenAIErrorType, string> = {
  rate_limit: "The AI service is receiving too many requests. Please retry.",
  timeout: "The AI service timed out. Please try again.",
  service_error:
    "The AI service is temporarily unavailable. Please try again shortly.",
  policy_blocked:
    "This request is not available for your current plan or request context.",
  unknown: "An error occurred while processing your request.",
};

function buildEndActionInstructions(
  supportEmail: string,
): Record<TaskEndAction, string> {
  return {
    start_new_conversation: "Start a new conversation to continue.",
    upgrade_plan: "Upgrade your plan to continue.",
    contact_support: `Contact support at ${supportEmail}.`,
  };
}

const openAiRequestBodySchema = z
  .object({
    messages: chatMessageArraySchema.min(1),
    taskId: nonEmptyStringSchema.nullable().optional(),
    personaId: nonEmptyStringSchema.nullable().optional(),
  })
  .strict();

type OpenAiRequestBody = z.infer<typeof openAiRequestBodySchema>;

interface ConversationStopPayload {
  taskData: Message;
  taskId?: string;
  personaId: PersonaId;
  error: string;
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  taskStatus: TaskStatus;
  acceptedPrompt: boolean;
}

type StopReasonMessages = Record<TaskEndedReason, string>;

type MediaUsageLimitType = "images" | "audio" | "video";
type MediaCounterScope = "plan" | "trial";

interface MediaSlotClaimResult {
  claimed: boolean;
  limit: number;
  remaining: number;
}

function estimateConversationBytes(messages: Message[]): number {
  if (messages.length === 0) {
    return 0;
  }

  return Buffer.byteLength(JSON.stringify(messages), "utf8");
}

function createStopTaskData({
  stopReason,
  endAction,
  supportEmail,
  stopReasonMessages,
}: {
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  supportEmail: string;
  stopReasonMessages: StopReasonMessages;
}): Message {
  const endActionInstructions = buildEndActionInstructions(supportEmail);
  const shouldAppendInstruction =
    stopReason !== "image_limit_reached" &&
    stopReason !== "audio_limit_reached" &&
    stopReason !== "video_limit_reached";
  const endActionInstruction = shouldAppendInstruction
    ? ` ${endActionInstructions[endAction]}`
    : "";

  return ensureMessageHasId({
    whois: "assistant",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `${stopReasonMessages[stopReason]}${endActionInstruction}`,
      },
    ],
  });
}

function createStopResponsePayload({
  taskData,
  taskId,
  personaId,
  stopReason,
  endAction,
  taskStatus,
  acceptedPrompt,
  stopReasonMessages,
}: {
  taskData: Message;
  taskId?: string;
  personaId: PersonaId;
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  taskStatus?: TaskStatus;
  acceptedPrompt: boolean;
  stopReasonMessages: StopReasonMessages;
}): ConversationStopPayload {
  return {
    taskData,
    taskId,
    personaId,
    error: stopReasonMessages[stopReason],
    stopReason,
    endAction,
    taskStatus: taskStatus ?? "ended",
    acceptedPrompt,
  };
}

function getPlanBoundEndAction({
  planName,
  planLimits,
}: {
  planName?: PlanName | null;
  planLimits: PlanLimits;
}): TaskEndAction {
  const normalizedPlanName: PlanName = planName ?? "Lite";

  return planLimits[normalizedPlanName].conversationsPerDay === -1
    ? "contact_support"
    : "upgrade_plan";
}

function createUsageTaskId(taskId?: string): string {
  return taskId ?? `request_${crypto.randomUUID()}`;
}

function isMediaLimitStopReason(
  value: OpenAIResponsePayload["blockedReason"],
): value is
  | "media_limit_reached"
  | "image_limit_reached"
  | "audio_limit_reached"
  | "video_limit_reached" {
  return (
    value === "media_limit_reached" ||
    value === "image_limit_reached" ||
    value === "audio_limit_reached" ||
    value === "video_limit_reached"
  );
}

function isMediaSpecificLimitStopReason(
  value: OpenAIResponsePayload["blockedReason"],
): value is
  | "image_limit_reached"
  | "audio_limit_reached"
  | "video_limit_reached" {
  return (
    value === "image_limit_reached" ||
    value === "audio_limit_reached" ||
    value === "video_limit_reached"
  );
}

function resolveMediaCounterField(
  limitType: MediaUsageLimitType,
  counterScope: MediaCounterScope,
):
  | "plan.imageGenerations"
  | "plan.audioGenerations"
  | "plan.videoGenerations"
  | "plan.trialUsage.trialImageGenerations"
  | "plan.trialUsage.trialAudioGenerations"
  | "plan.trialUsage.trialVideoGenerations" {
  if (counterScope === "trial") {
    if (limitType === "images") {
      return "plan.trialUsage.trialImageGenerations";
    }

    if (limitType === "audio") {
      return "plan.trialUsage.trialAudioGenerations";
    }

    return "plan.trialUsage.trialVideoGenerations";
  }

  if (limitType === "images") {
    return "plan.imageGenerations";
  }

  if (limitType === "audio") {
    return "plan.audioGenerations";
  }

  return "plan.videoGenerations";
}

async function claimMediaGenerationSlot({
  userId,
  limitType,
  limit,
  counterScope,
}: {
  userId: string;
  limitType: MediaUsageLimitType;
  limit: number;
  counterScope: MediaCounterScope;
}): Promise<MediaSlotClaimResult> {
  if (limit === -1) {
    return {
      claimed: true,
      limit,
      remaining: -1,
    };
  }

  const counterField = resolveMediaCounterField(limitType, counterScope);
  const updatedUser = await User.findOneAndUpdate(
    {
      clerkId: userId,
      [counterField]: { $lt: limit },
    },
    {
      $inc: {
        [counterField]: 1,
      },
    },
    {
      new: true,
      strict: true,
      upsert: false,
    },
  );

  if (!updatedUser) {
    return {
      claimed: false,
      limit,
      remaining: 0,
    };
  }

  const nextCountRaw =
    counterScope === "trial"
      ? limitType === "images"
        ? updatedUser.plan?.trialUsage?.trialImageGenerations
        : limitType === "audio"
          ? updatedUser.plan?.trialUsage?.trialAudioGenerations
          : updatedUser.plan?.trialUsage?.trialVideoGenerations
      : limitType === "images"
        ? updatedUser.plan?.imageGenerations
        : limitType === "audio"
          ? updatedUser.plan?.audioGenerations
          : updatedUser.plan?.videoGenerations;
  const nextCount =
    typeof nextCountRaw === "number" && Number.isFinite(nextCountRaw)
      ? nextCountRaw
      : 0;

  return {
    claimed: true,
    limit,
    remaining: Math.max(0, limit - nextCount),
  };
}

async function rollbackMediaGenerationSlot({
  userId,
  limitType,
  counterScope,
}: {
  userId: string;
  limitType: MediaUsageLimitType;
  counterScope: MediaCounterScope;
}): Promise<void> {
  const counterField = resolveMediaCounterField(limitType, counterScope);

  await User.findOneAndUpdate(
    {
      clerkId: userId,
      [counterField]: { $gt: 0 },
    },
    {
      $inc: {
        [counterField]: -1,
      },
    },
    {
      strict: true,
      upsert: false,
    },
  );
}

function shouldStreamResponse(req: Request): boolean {
  return (
    req.headers.get("x-droplet-stream") === "1" ||
    req.headers.get("accept")?.includes("text/event-stream") === true
  );
}

function writeStreamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: ChatStreamEvent,
) {
  controller.enqueue(
    streamEncoder.encode(`data: ${JSON.stringify(event)}\n\n`),
  );
}

function emitBlockedChatUsageEvent({
  userId,
  taskId,
  personaId,
  planName,
  stopReason,
  modelOverrides,
}: {
  userId: string;
  taskId?: string;
  personaId: PersonaId;
  planName?: PlanName | null;
  stopReason: TaskEndedReason;
  modelOverrides?: ModelPolicyModelOverrides;
}) {
  const policy = resolveModelPolicy({
    plan: normalizePlanTier(planName ?? "Lite"),
    feature: "chat",
    taskClass: DEFAULT_CHAT_TASK_CLASS,
    budgetState: DEFAULT_CHAT_BUDGET_STATE,
    modelOverrides,
  });

  if (policy.hardBlocked || policy.model === "blocked") {
    return;
  }

  emitUsageEventsSafely({
    userId,
    taskId: createUsageTaskId(taskId),
    personaId,
    metrics: [
      {
        requestType: "chat",
        model: policy.model,
        blocked: true,
        blockedReason: stopReason,
        latencyMs: 0,
      },
    ],
  });
}

function emitUsageEventsSafely(
  payload: Parameters<typeof emitUsageEvents>[0],
): void {
  try {
    emitUsageEvents(payload);
  } catch (error) {
    process.stderr.write(
      `[openai/route] emitUsageEvents failed: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
  }
}

async function resolvePromptLimitEndAction({
  userId,
  planName,
  planLimits,
}: {
  userId: string;
  planName?: PlanName | null;
  planLimits: PlanLimits;
}): Promise<TaskEndAction> {
  const normalizedPlanName: PlanName = planName ?? "Lite";

  if (planLimits[normalizedPlanName].promptsPerConversation === -1) {
    return "contact_support";
  }

  const dailyConversationLimit = await checkDailyConversationLimit(
    userId,
    normalizedPlanName,
    undefined,
    planLimits,
  );

  return dailyConversationLimit.remaining > 0
    ? "start_new_conversation"
    : "upgrade_plan";
}

function getLatestUserMessage(messages: Messages["messages"]): Message | null {
  const latestMessage = messages.at(-1);

  if (!latestMessage || latestMessage.role !== "user") {
    return null;
  }

  return latestMessage;
}

async function persistConversationStop({
  taskId,
  personaId,
  currentMessages,
  stopReason,
  endAction,
  estimatedBytes,
  supportEmail,
  stopReasonMessages,
}: {
  taskId: string;
  personaId: PersonaId;
  currentMessages: Message[];
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  estimatedBytes?: number;
  supportEmail: string;
  stopReasonMessages: StopReasonMessages;
}): Promise<Message> {
  const normalizedCurrentMessages = ensureMessagesHaveId(currentMessages);
  const stopTaskData = createStopTaskData({
    stopReason,
    endAction,
    supportEmail,
    stopReasonMessages,
  });
  const messagesWithStop = [...normalizedCurrentMessages, stopTaskData];
  const estimatedBytesWithStop = estimateConversationBytes(messagesWithStop);
  const canPersistStopMessage =
    estimatedBytesWithStop <= TASK_STORAGE_WARNING_BYTES;

  const updatePayload: UpdateTaskParams = {
    messages: canPersistStopMessage
      ? messagesWithStop
      : normalizedCurrentMessages,
    personaId,
    estimatedBytes:
      typeof estimatedBytes === "number"
        ? estimatedBytes
        : estimateConversationBytes(normalizedCurrentMessages),
    status: "ended",
    endedAt: new Date(),
    endedReason: stopReason,
    endAction,
  };

  if (canPersistStopMessage) {
    updatePayload.estimatedBytes = estimatedBytesWithStop;
  }

  await updateTask(taskId, updatePayload);

  return stopTaskData;
}

async function persistConversationNotice({
  taskId,
  personaId,
  currentMessages,
  noticeTaskData,
  estimatedBytes,
}: {
  taskId: string;
  personaId: PersonaId;
  currentMessages: Message[];
  noticeTaskData: Message;
  estimatedBytes?: number;
}): Promise<void> {
  const normalizedCurrentMessages = ensureMessagesHaveId(currentMessages);
  const normalizedNoticeTaskData = ensureMessageHasId(noticeTaskData);
  const messagesWithNotice = [
    ...normalizedCurrentMessages,
    normalizedNoticeTaskData,
  ];
  const estimatedBytesWithNotice =
    estimateConversationBytes(messagesWithNotice);
  const canPersistNotice =
    estimatedBytesWithNotice <= TASK_STORAGE_WARNING_BYTES;

  await updateTask(taskId, {
    messages: canPersistNotice ? messagesWithNotice : normalizedCurrentMessages,
    personaId,
    estimatedBytes: canPersistNotice
      ? estimatedBytesWithNotice
      : typeof estimatedBytes === "number"
        ? estimatedBytes
        : estimateConversationBytes(normalizedCurrentMessages),
  });
}

async function finalizeAIResponse({
  aiPayload,
  taskId,
  userId,
  planName,
  planLimits,
  isTrialPersona,
  modelOverrides,
  selectedPersonaId,
  storedMessagesWithIncomingPrompt,
  estimatedBytesWithIncomingPrompt,
  supportEmail,
  stopReasonMessages,
}: {
  aiPayload: OpenAIResponsePayload;
  taskId: string;
  userId: string;
  planName: PlanName;
  planLimits: PlanLimits;
  isTrialPersona: boolean;
  modelOverrides?: ModelPolicyModelOverrides;
  selectedPersonaId: PersonaId;
  storedMessagesWithIncomingPrompt: Message[];
  estimatedBytesWithIncomingPrompt: number;
  supportEmail: string;
  stopReasonMessages: StopReasonMessages;
}): Promise<{
  status: number;
  payload: ChatApiResponse;
}> {
  if (aiPayload.requestMetrics?.length) {
    emitUsageEventsSafely({
      userId,
      taskId,
      personaId: selectedPersonaId,
      metrics: aiPayload.requestMetrics,
    });
  }

  if (aiPayload.errorType) {
    return {
      status: OPENAI_ERROR_STATUS_MAP[aiPayload.errorType],
      payload: {
        error:
          aiPayload.errorMessage ?? OPENAI_ERROR_MESSAGES[aiPayload.errorType],
      },
    };
  }

  const normalizedStoredMessagesWithIncomingPrompt = ensureMessagesHaveId(
    storedMessagesWithIncomingPrompt,
  );
  const { taskData, taskUsage } = aiPayload;

  if (isMediaLimitStopReason(aiPayload.blockedReason)) {
    const stopReason: TaskEndedReason = isTrialPersona
      ? "trial_limit_reached"
      : aiPayload.blockedReason;
    const isNonTerminalMediaLimit =
      !isTrialPersona &&
      isMediaSpecificLimitStopReason(aiPayload.blockedReason);
    const endAction: TaskEndAction = isTrialPersona
      ? "upgrade_plan"
      : isNonTerminalMediaLimit
        ? "start_new_conversation"
        : getPlanBoundEndAction({ planName, planLimits });
    let taskDataToPersist: Message;

    if (isNonTerminalMediaLimit) {
      taskDataToPersist = createStopTaskData({
        stopReason,
        endAction,
        supportEmail,
        stopReasonMessages,
      });
      await persistConversationNotice({
        taskId,
        personaId: selectedPersonaId,
        currentMessages: normalizedStoredMessagesWithIncomingPrompt,
        noticeTaskData: taskDataToPersist,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
      });
    } else {
      taskDataToPersist = await persistConversationStop({
        taskId,
        personaId: selectedPersonaId,
        currentMessages: normalizedStoredMessagesWithIncomingPrompt,
        stopReason,
        endAction,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
        supportEmail,
        stopReasonMessages,
      });
    }

    return {
      status: 403,
      payload: createStopResponsePayload({
        taskData: taskDataToPersist,
        taskId,
        personaId: selectedPersonaId,
        stopReason,
        endAction,
        taskStatus: isNonTerminalMediaLimit ? "active" : "ended",
        acceptedPrompt: true,
        stopReasonMessages,
      }),
    };
  }

  if (!taskData) {
    throw new Error("AI response payload is missing task data.");
  }

  const normalizedTaskData = ensureMessageHasId(taskData);
  const storedMessagesWithAssistant = [
    ...normalizedStoredMessagesWithIncomingPrompt,
    normalizedTaskData,
  ];
  const estimatedBytesWithAssistant = estimateConversationBytes(
    storedMessagesWithAssistant,
  );

  if (estimatedBytesWithAssistant > TASK_STORAGE_WARNING_BYTES) {
    const stopReason: TaskEndedReason = "conversation_storage_limit_reached";
    const endAction: TaskEndAction = "start_new_conversation";
    const taskDataToPersist = await persistConversationStop({
      taskId,
      personaId: selectedPersonaId,
      currentMessages: storedMessagesWithIncomingPrompt,
      stopReason,
      endAction,
      estimatedBytes: estimatedBytesWithIncomingPrompt,
      supportEmail,
      stopReasonMessages,
    });

    emitBlockedChatUsageEvent({
      userId,
      taskId,
      personaId: selectedPersonaId,
      planName,
      stopReason,
      modelOverrides,
    });

    return {
      status: 403,
      payload: createStopResponsePayload({
        taskData: taskDataToPersist,
        taskId,
        personaId: selectedPersonaId,
        stopReason,
        endAction,
        acceptedPrompt: true,
        stopReasonMessages,
      }),
    };
  }

  await updateTask(taskId, {
    messages: storedMessagesWithAssistant,
    usage: taskUsage ?? 0,
    personaId: selectedPersonaId,
    estimatedBytes: estimatedBytesWithAssistant,
  });

  return {
    status: 200,
    payload: {
      taskData: normalizedTaskData,
      taskId,
      personaId: selectedPersonaId,
      acceptedPrompt: true,
    },
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const streamingResponseRequested = shouldStreamResponse(req);
    let rawRequestBody: unknown;

    try {
      rawRequestBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const parsedRequestBody = openAiRequestBodySchema.safeParse(rawRequestBody);

    if (!parsedRequestBody.success) {
      process.stderr.write(
        `[openai/route] invalid request body: ${JSON.stringify(parsedRequestBody.error.issues)}\n`,
      );

      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const {
      messages: parsedRequestMessages,
      taskId: providedTaskId,
      personaId,
    }: OpenAiRequestBody = parsedRequestBody.data;
    const requestMessages = ensureMessagesHaveId(parsedRequestMessages);
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const latestUserMessage = getLatestUserMessage(requestMessages);
    if (!latestUserMessage) {
      return NextResponse.json(
        {
          error: "A user message is required to continue the conversation.",
        },
        { status: 400 },
      );
    }

    const rateLimit = await enforceSlidingWindowRateLimit({
      key: `openai:${userId}`,
      limit: OPENAI_RATE_LIMIT_MAX_REQUESTS,
      windowMs: OPENAI_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          },
        },
      );
    }

    let userData = (await getUserById(userId)) as UserData | null;

    if (!userData) {
      userData = await ensureUserSynced(userId);
    }

    if (!userData) {
      return NextResponse.json(
        {
          error: "Account not yet provisioned. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    const isSuspended = Boolean(userData.suspended);
    if (isSuspended) {
      return NextResponse.json(
        { error: "Account suspended." },
        { status: 403 },
      );
    }

    const isAdminUser = userData.role === "admin";
    const planName = userData.plan?.name ?? "Lite";
    const [
      effectivePlanConfig,
      fullPersonaAccessByPlan,
      effectiveModelConfig,
      supportEmail,
      stopReasonMessages,
    ] = await Promise.all([
      getEffectivePlanConfig(),
      getEffectivePersonaAccessByPlan(),
      getEffectiveModelConfig(),
      getEffectiveSupportEmail(),
      getEffectiveStopReasonMessages(),
    ]);
    const effectivePlanLimits = effectivePlanConfig.limits;
    const effectiveTrialLimits = effectivePlanConfig.trialLimits;
    const modelOverrides: ModelPolicyModelOverrides = {
      chat: {
        lite: effectiveModelConfig.liteChatModel,
        pro: effectiveModelConfig.proChatModel,
        premium: effectiveModelConfig.premiumChatModel,
      },
      imageGenerationModel: effectiveModelConfig.imageModel,
      audioGenerationModel: effectiveModelConfig.audioModel,
      videoGenerationModel: effectiveModelConfig.videoModel,
    };
    const persistedTask = providedTaskId
      ? await getTaskByIdForUser({
          taskId: providedTaskId,
          userId,
        })
      : null;

    if (providedTaskId && !persistedTask) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const selectedPersona = getPersona(persistedTask?.personaId ?? personaId);

    if (persistedTask?.status === "ended") {
      const stopReason =
        persistedTask.endedReason ?? "conversation_storage_limit_reached";
      const endAction = persistedTask.endAction ?? "start_new_conversation";
      const taskData = createStopTaskData({
        stopReason,
        endAction,
        supportEmail,
        stopReasonMessages,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData,
          taskId: persistedTask._id,
          personaId: persistedTask.personaId,
          stopReason,
          endAction,
          acceptedPrompt: false,
          stopReasonMessages,
        }),
        { status: 409 },
      );
    }

    if (!isAdminUser && planName !== "Lite" && userData?.plan?.expiresOn) {
      const expiresOn = new Date(userData.plan.expiresOn);

      if (expiresOn < new Date()) {
        const stopReason: TaskEndedReason = "billing_state_invalid";
        const endAction: TaskEndAction = "upgrade_plan";

        if (persistedTask) {
          const taskData = await persistConversationStop({
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            currentMessages: persistedTask.messages,
            stopReason,
            endAction,
            estimatedBytes: persistedTask.estimatedBytes,
            supportEmail,
            stopReasonMessages,
          });

          emitBlockedChatUsageEvent({
            userId,
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            planName,
            stopReason,
            modelOverrides,
          });

          return NextResponse.json(
            createStopResponsePayload({
              taskData,
              taskId: persistedTask._id,
              personaId: selectedPersona.id,
              stopReason,
              endAction,
              acceptedPrompt: false,
              stopReasonMessages,
            }),
            { status: 403 },
          );
        }

        const taskData = createStopTaskData({
          stopReason,
          endAction,
          supportEmail,
          stopReasonMessages,
        });

        emitBlockedChatUsageEvent({
          userId,
          personaId: selectedPersona.id,
          planName,
          stopReason,
          modelOverrides,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
            stopReasonMessages,
          }),
          { status: 403 },
        );
      }
    }

    const entitlements = resolveEntitlements(planName, {
      isSuspended,
      isAdmin: isAdminUser,
      planLimits: effectivePlanLimits,
      fullPersonaAccessByPlan,
    });

    const selectedPersonaAccess = isAdminUser
      ? "full"
      : entitlements.personaAccess?.[selectedPersona.id]
        ? entitlements.personaAccess[selectedPersona.id]
        : entitlements.allowedPersonaIds.includes(selectedPersona.id)
          ? "full"
          : "blocked";
    const isTrialPersona = selectedPersonaAccess === "limited";

    if (selectedPersonaAccess === "blocked") {
      return NextResponse.json(
        {
          error: "Selected persona is not available for your current plan.",
        },
        { status: 403 },
      );
    }

    const imageUsage = checkUsageLimit({
      planName,
      currentCount: isTrialPersona
        ? userData?.plan?.trialUsage?.trialImageGenerations
        : userData?.plan?.imageGenerations,
      limitType: "images",
      overrideLimit: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.images
          : undefined,
      usagePeriodStart: isTrialPersona
        ? userData?.plan?.trialUsage?.trialUsagePeriodStart
        : userData?.plan?.usagePeriodStart,
      planLimits: effectivePlanLimits,
    });
    const audioUsage = checkUsageLimit({
      planName,
      currentCount: isTrialPersona
        ? userData?.plan?.trialUsage?.trialAudioGenerations
        : userData?.plan?.audioGenerations,
      limitType: "audio",
      overrideLimit: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.audio
          : undefined,
      usagePeriodStart: isTrialPersona
        ? userData?.plan?.trialUsage?.trialUsagePeriodStart
        : userData?.plan?.usagePeriodStart,
      planLimits: effectivePlanLimits,
    });
    const videoUsage = checkUsageLimit({
      planName,
      currentCount: isTrialPersona
        ? userData?.plan?.trialUsage?.trialVideoGenerations
        : userData?.plan?.videoGenerations,
      limitType: "video",
      overrideLimit: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.video
          : undefined,
      usagePeriodStart: isTrialPersona
        ? userData?.plan?.trialUsage?.trialUsagePeriodStart
        : userData?.plan?.usagePeriodStart,
      planLimits: effectivePlanLimits,
    });

    if (imageUsage.didReset || audioUsage.didReset || videoUsage.didReset) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        isTrialPersona
          ? {
              $set: {
                "plan.trialUsage.trialImageGenerations": 0,
                "plan.trialUsage.trialAudioGenerations": 0,
                "plan.trialUsage.trialVideoGenerations": 0,
                "plan.trialUsage.trialUsagePeriodStart": new Date(),
              },
            }
          : {
              $set: {
                "plan.imageGenerations": 0,
                "plan.audioGenerations": 0,
                "plan.videoGenerations": 0,
                "plan.usagePeriodStart": new Date(),
              },
            },
        {
          strict: true,
          upsert: false,
        },
      );
    }

    const imageLimitReached =
      entitlements.supportsImageGeneration && !imageUsage.allowed;
    const audioLimitReached =
      entitlements.supportsAudioGeneration && !audioUsage.allowed;
    const videoLimitReached =
      entitlements.supportsVideoGeneration && !videoUsage.allowed;

    const resolvedEntitlements = {
      ...entitlements,
      imageLimitReached,
      audioLimitReached,
      videoLimitReached,
    };

    const storedMessagesBeforePrompt = ensureMessagesHaveId(
      persistedTask?.messages ?? [],
    );
    const storedMessagesWithIncomingPrompt = providedTaskId
      ? [...storedMessagesBeforePrompt, latestUserMessage]
      : requestMessages;
    const promptPayloadMessages = providedTaskId
      ? filterAssistantMsg(storedMessagesWithIncomingPrompt)
      : filterAssistantMsg(requestMessages);
    const estimatedBytesWithIncomingPrompt = estimateConversationBytes(
      storedMessagesWithIncomingPrompt,
    );

    if (estimatedBytesWithIncomingPrompt > TASK_STORAGE_WARNING_BYTES) {
      const stopReason: TaskEndedReason = "conversation_storage_limit_reached";
      const endAction: TaskEndAction = "start_new_conversation";

      if (persistedTask) {
        const taskData = await persistConversationStop({
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          currentMessages: persistedTask.messages,
          stopReason,
          endAction,
          estimatedBytes: persistedTask.estimatedBytes,
          supportEmail,
          stopReasonMessages,
        });

        emitBlockedChatUsageEvent({
          userId,
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          planName,
          stopReason,
          modelOverrides,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
            stopReasonMessages,
          }),
          { status: 403 },
        );
      }

      const taskData = createStopTaskData({
        stopReason,
        endAction,
        supportEmail,
        stopReasonMessages,
      });

      emitBlockedChatUsageEvent({
        userId,
        personaId: selectedPersona.id,
        planName,
        stopReason,
        modelOverrides,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData,
          personaId: selectedPersona.id,
          stopReason,
          endAction,
          acceptedPrompt: false,
          stopReasonMessages,
        }),
        { status: 403 },
      );
    }

    const promptLimit = isAdminUser
      ? -1
      : isTrialPersona
        ? effectiveTrialLimits.promptsPerConversation
        : effectivePlanLimits[planName].promptsPerConversation;

    if (persistedTask && promptLimit !== -1) {
      const promptSlotClaimed = await incrementPromptCountIfBelowLimit({
        taskId: persistedTask._id,
        limit: promptLimit,
      });

      if (!promptSlotClaimed) {
        const stopReason: TaskEndedReason = isTrialPersona
          ? "trial_limit_reached"
          : "prompt_limit_reached";
        const endAction: TaskEndAction = isTrialPersona
          ? "upgrade_plan"
          : await resolvePromptLimitEndAction({
              userId,
              planName,
              planLimits: effectivePlanLimits,
            });
        const taskData = await persistConversationStop({
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          currentMessages: persistedTask.messages,
          stopReason,
          endAction,
          estimatedBytes: persistedTask.estimatedBytes,
          supportEmail,
          stopReasonMessages,
        });

        emitBlockedChatUsageEvent({
          userId,
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          planName,
          stopReason,
          modelOverrides,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
            stopReasonMessages,
          }),
          { status: 403 },
        );
      }
    }

    let taskId = providedTaskId;

    if (!taskId && !isAdminUser) {
      const claimResult = await claimDailyConversationSlot(
        userId,
        planName,
        undefined,
        effectivePlanLimits,
      );

      if (!claimResult.claimed) {
        const stopReason: TaskEndedReason = "daily_conversation_limit_reached";
        const endAction = getPlanBoundEndAction({
          planName,
          planLimits: effectivePlanLimits,
        });
        const taskData = createStopTaskData({
          stopReason,
          endAction,
          supportEmail,
          stopReasonMessages,
        });

        emitBlockedChatUsageEvent({
          userId,
          personaId: selectedPersona.id,
          planName,
          stopReason,
          modelOverrides,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
            stopReasonMessages,
          }),
          { status: 403 },
        );
      }

      const generatedTitle = await generateTitle(
        promptPayloadMessages,
        planName,
        selectedPersona.id,
        modelOverrides,
      );
      const {
        title,
        usage,
        requestMetric: titleRequestMetric,
      } = generatedTitle;

      let newTask;
      try {
        newTask = await createTask({
          title,
          messages: storedMessagesWithIncomingPrompt,
          usage,
          personaId: selectedPersona.id,
          promptCount: 1,
          estimatedBytes: estimatedBytesWithIncomingPrompt,
        });
      } catch (createError) {
        // Rollback the claimed slot — wrap in try/catch so rollback failure
        // doesn't mask the original error.
        try {
          await User.findOneAndUpdate(
            { clerkId: userId },
            { $inc: { dailyConversationsStarted: -1 } },
            { strict: true, upsert: false },
          );
        } catch (rollbackError) {
          process.stderr.write(
            `[openai/route] daily slot rollback failed after createTask error: ${rollbackError instanceof Error ? rollbackError.message : "unknown"}\\n`,
          );
        }
        throw createError;
      }

      if (!newTask) {
        throw new Error("Task creation failed.");
      }

      const createdTaskId = newTask._id;

      if (!createdTaskId) {
        throw new Error("Created task is missing an identifier.");
      }

      taskId = createdTaskId;

      if (titleRequestMetric) {
        emitUsageEventsSafely({
          userId,
          taskId: createdTaskId,
          personaId: selectedPersona.id,
          metrics: [titleRequestMetric],
        });
      }
    }

    if (!taskId && isAdminUser) {
      const generatedTitle = await generateTitle(
        promptPayloadMessages,
        planName,
        selectedPersona.id,
        modelOverrides,
      );
      const {
        title,
        usage,
        requestMetric: titleRequestMetric,
      } = generatedTitle;

      const newTask = await createTask({
        title,
        messages: storedMessagesWithIncomingPrompt,
        usage,
        personaId: selectedPersona.id,
        promptCount: 1,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
      });

      if (!newTask?._id) {
        throw new Error("Task creation failed.");
      }

      const createdTaskId = newTask._id;
      taskId = createdTaskId;

      if (titleRequestMetric) {
        emitUsageEventsSafely({
          userId,
          taskId: createdTaskId,
          personaId: selectedPersona.id,
          metrics: [titleRequestMetric],
        });
      }
    }

    if (!taskId) {
      throw new Error("Task ID is undefined.");
    }

    const chatTaskClass = classifyTaskComplexity({
      messages: promptPayloadMessages,
      latestUserMessage,
    });
    const explicitPremiumRequested =
      chatTaskClass === "complex" &&
      isExplicitDeepAnalysisRequest(latestUserMessage);
    const mediaGenerationLimitByType = {
      images: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.images
          : effectivePlanLimits[planName].images,
      audio: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.audio
          : effectivePlanLimits[planName].audio,
      video: isAdminUser
        ? -1
        : isTrialPersona
          ? effectiveTrialLimits.video
          : effectivePlanLimits[planName].video,
    } as const;

    if (streamingResponseRequested) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let didSendFinal = false;
          let generalHeartbeatInterval: ReturnType<typeof setInterval> | null =
            null;
          let mediaHeartbeatInterval: ReturnType<typeof setInterval> | null =
            null;

          const writeErrorEvent = (
            errorMessage: string,
            context: string,
          ): boolean => {
            try {
              writeStreamEvent(controller, {
                type: "error",
                error: errorMessage,
              });
              didSendFinal = true;
              return true;
            } catch (error) {
              process.stderr.write(
                `[openai/route] ${context}: ${error instanceof Error ? error.message : "unknown"}\n`,
              );
              return false;
            }
          };

          const writeFinalEvent = (
            payload: ChatApiResponse,
            context: string,
          ): boolean => {
            try {
              writeStreamEvent(controller, {
                type: "final",
                payload,
              });
              didSendFinal = true;
              return true;
            } catch (error) {
              process.stderr.write(
                `[openai/route] ${context}: ${error instanceof Error ? error.message : "unknown"}\n`,
              );
              return false;
            }
          };

          const stopGeneralHeartbeat = () => {
            if (generalHeartbeatInterval === null) {
              return;
            }

            clearInterval(generalHeartbeatInterval);
            generalHeartbeatInterval = null;
          };

          const stopMediaHeartbeat = () => {
            if (mediaHeartbeatInterval === null) {
              return;
            }

            clearInterval(mediaHeartbeatInterval);
            mediaHeartbeatInterval = null;
          };

          const emitHeartbeat = (): boolean => {
            try {
              writeStreamEvent(controller, {
                type: "heartbeat",
              });
              return true;
            } catch (error) {
              process.stderr.write(
                `[openai/route] heartbeat write failed: ${error instanceof Error ? error.message : "unknown"}\n`,
              );
              return false;
            }
          };

          const startGeneralHeartbeat = () => {
            if (generalHeartbeatInterval !== null) {
              return;
            }

            generalHeartbeatInterval = setInterval(() => {
              if (!emitHeartbeat()) {
                stopGeneralHeartbeat();
              }
            }, STREAM_GENERAL_HEARTBEAT_INTERVAL_MS);
          };

          const startMediaHeartbeat = () => {
            if (mediaHeartbeatInterval !== null) {
              return;
            }

            if (!emitHeartbeat()) {
              return;
            }

            mediaHeartbeatInterval = setInterval(() => {
              if (!emitHeartbeat()) {
                stopMediaHeartbeat();
              }
            }, STREAM_MEDIA_HEARTBEAT_INTERVAL_MS);
          };

          try {
            writeStreamEvent(controller, {
              type: "meta",
              taskId,
              personaId: selectedPersona.id,
            });
            startGeneralHeartbeat();

            const aiPayload = await generateStreamingResponse({
              messages: promptPayloadMessages,
              taskId,
              userId,
              personaId: selectedPersona.id,
              planName,
              entitlements: resolvedEntitlements,
              modelOverrides,
              taskClass: chatTaskClass,
              budgetState: DEFAULT_CHAT_BUDGET_STATE,
              explicitPremium: explicitPremiumRequested,
              claimMediaGenerationSlot: async ({ limitType }) =>
                claimMediaGenerationSlot({
                  userId,
                  limitType,
                  limit: mediaGenerationLimitByType[limitType],
                  counterScope: isTrialPersona ? "trial" : "plan",
                }),
              rollbackMediaGenerationSlot: async ({ limitType }) =>
                rollbackMediaGenerationSlot({
                  userId,
                  limitType,
                  counterScope: isTrialPersona ? "trial" : "plan",
                }),
              abortSignal: req.signal,
              onContentChunk: (delta, snapshot) => {
                writeStreamEvent(controller, {
                  type: "chunk",
                  delta,
                  snapshot,
                });
              },
              onMediaGenerationStart: startMediaHeartbeat,
              onMediaGenerationEnd: stopMediaHeartbeat,
            });

            const finalResult = await finalizeAIResponse({
              aiPayload,
              taskId,
              userId,
              planName,
              planLimits: effectivePlanLimits,
              isTrialPersona,
              modelOverrides,
              selectedPersonaId: selectedPersona.id,
              storedMessagesWithIncomingPrompt,
              estimatedBytesWithIncomingPrompt,
              supportEmail,
              stopReasonMessages,
            });

            if (finalResult.payload.error && !finalResult.payload.taskData) {
              writeErrorEvent(
                finalResult.payload.error,
                "failed to write error event to stream",
              );
            } else {
              writeFinalEvent(
                finalResult.payload,
                "failed to write final event to stream",
              );
            }
          } catch (error) {
            process.stderr.write(
              `[openai/route] streaming pipeline failed: ${error instanceof Error ? error.message : "unknown"}\n`,
            );
            writeErrorEvent(
              OPENAI_ERROR_MESSAGES.unknown,
              "failed to write fallback error event to stream",
            );
          } finally {
            stopGeneralHeartbeat();
            stopMediaHeartbeat();
            if (!didSendFinal) {
              writeErrorEvent(
                OPENAI_ERROR_MESSAGES.unknown,
                "failed to write synthetic final error event to stream",
              );
            }
            try {
              controller.close();
            } catch (error) {
              process.stderr.write(
                `[openai/route] failed to close stream controller: ${error instanceof Error ? error.message : "unknown"}\n`,
              );
            }
          }
        },
      });

      return new Response(stream, {
        headers: STREAM_HEADERS,
      });
    }

    const aiPayload = await generateResponse({
      messages: promptPayloadMessages,
      taskId,
      userId,
      personaId: selectedPersona.id,
      planName,
      entitlements: resolvedEntitlements,
      modelOverrides,
      taskClass: chatTaskClass,
      budgetState: DEFAULT_CHAT_BUDGET_STATE,
      explicitPremium: explicitPremiumRequested,
      claimMediaGenerationSlot: async ({ limitType }) =>
        claimMediaGenerationSlot({
          userId,
          limitType,
          limit: mediaGenerationLimitByType[limitType],
          counterScope: isTrialPersona ? "trial" : "plan",
        }),
      rollbackMediaGenerationSlot: async ({ limitType }) =>
        rollbackMediaGenerationSlot({
          userId,
          limitType,
          counterScope: isTrialPersona ? "trial" : "plan",
        }),
    });

    const finalResult = await finalizeAIResponse({
      aiPayload,
      taskId,
      userId,
      planName,
      planLimits: effectivePlanLimits,
      isTrialPersona,
      modelOverrides,
      selectedPersonaId: selectedPersona.id,
      storedMessagesWithIncomingPrompt,
      estimatedBytesWithIncomingPrompt,
      supportEmail,
      stopReasonMessages,
    });

    return NextResponse.json(finalResult.payload, {
      status: finalResult.status,
    });
  } catch {
    return NextResponse.json(
      { error: OPENAI_ERROR_MESSAGES.unknown },
      { status: OPENAI_ERROR_STATUS_MAP.unknown },
    );
  }
}
