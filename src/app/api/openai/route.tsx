import { NextResponse } from "next/server";
import { Message, Messages } from "@/types";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import {
  TaskEndAction,
  TaskEndedReason,
  TaskStatus,
  UpdateTaskParams,
} from "@/types/TaskData.d";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import {
  resolvePersonaForPlan,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";
import User from "@/lib/database/models/user.model";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";
import type { OpenAIErrorType } from "@/lib/utils/openai/generateResponse";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import { PLAN_LIMITS } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import { resolveModelForPlan } from "@/lib/utils/ai-model-policy";
import {
  AIRequestMetric,
  emitUsageEvents,
} from "@/lib/utils/usage-event-utils";

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;
const TASK_STORAGE_WARNING_BYTES = 12 * 1024 * 1024;
const SUPPORT_EMAIL = "office@jordachewd.com";

const OPENAI_ERROR_STATUS_MAP: Record<OpenAIErrorType, number> = {
  rate_limit: 429,
  timeout: 504,
  service_error: 502,
  unknown: 500,
};

const OPENAI_ERROR_MESSAGES: Record<OpenAIErrorType, string> = {
  rate_limit: "The AI service is receiving too many requests. Please retry.",
  timeout: "The AI service timed out. Please try again.",
  service_error:
    "The AI service is temporarily unavailable. Please try again shortly.",
  unknown: "An error occurred while processing your request.",
};

const STOP_REASON_MESSAGES: Record<TaskEndedReason, string> = {
  prompt_limit_reached:
    "You've reached the message limit for this conversation.",
  media_limit_reached: "You've reached your media generation limit.",
  daily_conversation_limit_reached:
    "You've reached the daily conversation limit for your plan.",
  conversation_storage_limit_reached:
    "This conversation has reached its storage limit.",
  billing_state_invalid: "Your plan has expired.",
};

const END_ACTION_INSTRUCTIONS: Record<TaskEndAction, string> = {
  start_new_conversation: "Start a new conversation to continue.",
  upgrade_plan: "Upgrade your plan to continue.",
  contact_support: `Contact support at ${SUPPORT_EMAIL}.`,
};

interface OpenAIResponsePayload {
  taskData?: Message;
  taskUsage?: number;
  generatedImage?: boolean;
  generatedAudio?: boolean;
  blockedReason?: string;
  errorType?: OpenAIErrorType;
  requestMetrics?: AIRequestMetric[];
}

interface TitleResponsePayload {
  title: string;
  usage: number;
  requestMetric?: AIRequestMetric;
}

interface ConversationStopPayload {
  taskData: Message;
  taskId?: string;
  personaId: string;
  error: string;
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  taskStatus: TaskStatus;
  acceptedPrompt: boolean;
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
}: {
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
}): Message {
  return {
    whois: "assistant",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `${STOP_REASON_MESSAGES[stopReason]} ${END_ACTION_INSTRUCTIONS[endAction]}`,
      },
    ],
  };
}

function createStopResponsePayload({
  taskData,
  taskId,
  personaId,
  stopReason,
  endAction,
  acceptedPrompt,
}: {
  taskData: Message;
  taskId?: string;
  personaId: string;
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  acceptedPrompt: boolean;
}): ConversationStopPayload {
  return {
    taskData,
    taskId,
    personaId,
    error: STOP_REASON_MESSAGES[stopReason],
    stopReason,
    endAction,
    taskStatus: "ended",
    acceptedPrompt,
  };
}

function getPlanBoundEndAction(planName?: PlanName | null): TaskEndAction {
  const normalizedPlanName: PlanName = planName ?? "Lite";

  return PLAN_LIMITS[normalizedPlanName].conversationsPerDay === -1
    ? "contact_support"
    : "upgrade_plan";
}

function createUsageTaskId(taskId?: string): string {
  return taskId ?? `request_${crypto.randomUUID()}`;
}

function emitBlockedChatUsageEvent({
  userId,
  taskId,
  personaId,
  planName,
  stopReason,
}: {
  userId: string;
  taskId?: string;
  personaId: PersonaId;
  planName?: PlanName | null;
  stopReason: TaskEndedReason;
}) {
  const model = resolveModelForPlan(planName ?? "Lite", "chat");

  if (!model) {
    return;
  }

  emitUsageEvents({
    userId,
    taskId: createUsageTaskId(taskId),
    personaId,
    metrics: [
      {
        requestType: "chat",
        model,
        blocked: true,
        blockedReason: stopReason,
        latencyMs: 0,
      },
    ],
  });
}

async function resolvePromptLimitEndAction({
  userId,
  planName,
}: {
  userId: string;
  planName?: PlanName | null;
}): Promise<TaskEndAction> {
  const normalizedPlanName: PlanName = planName ?? "Lite";

  if (PLAN_LIMITS[normalizedPlanName].promptsPerConversation === -1) {
    return "contact_support";
  }

  const dailyConversationLimit = await checkDailyConversationLimit(
    userId,
    normalizedPlanName,
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
  promptCountIncrement = 0,
  estimatedBytes,
}: {
  taskId: string;
  personaId: PersonaId;
  currentMessages: Message[];
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  promptCountIncrement?: number;
  estimatedBytes?: number;
}): Promise<Message> {
  const stopTaskData = createStopTaskData({ stopReason, endAction });
  const messagesWithStop = [...currentMessages, stopTaskData];
  const estimatedBytesWithStop = estimateConversationBytes(messagesWithStop);
  const canPersistStopMessage =
    estimatedBytesWithStop <= TASK_STORAGE_WARNING_BYTES;

  const updatePayload: UpdateTaskParams = {
    messages: canPersistStopMessage ? messagesWithStop : currentMessages,
    personaId,
    promptCountIncrement,
    estimatedBytes:
      typeof estimatedBytes === "number"
        ? estimatedBytes
        : estimateConversationBytes(currentMessages),
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

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const {
      messages: requestMessages,
      taskId: providedTaskId,
      personaId,
    } = (await req.json()) as Messages;
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

    const rateLimit = enforceSlidingWindowRateLimit({
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

    const userData = (await getUserById(userId)) as UserData | null;
    const planName = userData?.plan?.name ?? "Lite";
    const combinedMediaUsageCount =
      (userData?.plan?.imageGenerations ?? 0) +
      (userData?.plan?.audioGenerations ?? 0);
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

    const selectedPersona = resolvePersonaForPlan({
      personaId: persistedTask?.personaId ?? personaId,
      planName,
    });

    if (persistedTask?.status === "ended") {
      const stopReason =
        persistedTask.endedReason ?? "conversation_storage_limit_reached";
      const endAction = persistedTask.endAction ?? "start_new_conversation";
      const taskData = createStopTaskData({
        stopReason,
        endAction,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData,
          taskId: persistedTask._id,
          personaId: persistedTask.personaId,
          stopReason,
          endAction,
          acceptedPrompt: false,
        }),
        { status: 409 },
      );
    }

    if (planName !== "Lite" && userData?.plan?.expiresOn) {
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
          });

          emitBlockedChatUsageEvent({
            userId,
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            planName,
            stopReason,
          });

          return NextResponse.json(
            createStopResponsePayload({
              taskData,
              taskId: persistedTask._id,
              personaId: selectedPersona.id,
              stopReason,
              endAction,
              acceptedPrompt: false,
            }),
            { status: 403 },
          );
        }

        const taskData = createStopTaskData({
          stopReason,
          endAction,
        });

        emitBlockedChatUsageEvent({
          userId,
          personaId: selectedPersona.id,
          planName,
          stopReason,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
          }),
          { status: 403 },
        );
      }
    }

    const entitlements = resolveEntitlements(planName);
    const imageUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.imageGenerations,
      combinedCount: combinedMediaUsageCount,
      limitType: "images",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });
    const audioUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.audioGenerations,
      combinedCount: combinedMediaUsageCount,
      limitType: "audio",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });

    if (imageUsage.didReset || audioUsage.didReset) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        {
          $set: {
            "plan.imageGenerations": 0,
            "plan.audioGenerations": 0,
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

    const resolvedEntitlements = {
      ...entitlements,
      supportsImageGeneration:
        entitlements.supportsImageGeneration && !imageLimitReached,
      supportsAudioGeneration:
        entitlements.supportsAudioGeneration && !audioLimitReached,
      imageLimitReached,
      audioLimitReached,
    };

    if (!providedTaskId) {
      const dailyConversationLimit = await checkDailyConversationLimit(
        userId,
        planName,
      );

      if (!dailyConversationLimit.allowed) {
        const stopReason: TaskEndedReason = "daily_conversation_limit_reached";
        const endAction = getPlanBoundEndAction(planName);
        const taskData = createStopTaskData({
          stopReason,
          endAction,
        });

        emitBlockedChatUsageEvent({
          userId,
          personaId: selectedPersona.id,
          planName,
          stopReason,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
          }),
          { status: 403 },
        );
      }
    }

    const storedMessagesBeforePrompt = persistedTask?.messages ?? [];
    const storedMessagesWithIncomingPrompt = providedTaskId
      ? [...storedMessagesBeforePrompt, latestUserMessage]
      : requestMessages;
    const promptPayloadMessages = providedTaskId
      ? filterAssistantMsg(storedMessagesWithIncomingPrompt)
      : filterAssistantMsg(requestMessages);
    const estimatedBytesWithIncomingPrompt = estimateConversationBytes(
      storedMessagesWithIncomingPrompt,
    );

    if (
      persistedTask &&
      PLAN_LIMITS[planName].promptsPerConversation !== -1 &&
      persistedTask.promptCount >= PLAN_LIMITS[planName].promptsPerConversation
    ) {
      const stopReason: TaskEndedReason = "prompt_limit_reached";
      const endAction = await resolvePromptLimitEndAction({
        userId,
        planName,
      });
      const taskData = await persistConversationStop({
        taskId: persistedTask._id,
        personaId: selectedPersona.id,
        currentMessages: persistedTask.messages,
        stopReason,
        endAction,
        estimatedBytes: persistedTask.estimatedBytes,
      });

      emitBlockedChatUsageEvent({
        userId,
        taskId: persistedTask._id,
        personaId: selectedPersona.id,
        planName,
        stopReason,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData,
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          stopReason,
          endAction,
          acceptedPrompt: false,
        }),
        { status: 403 },
      );
    }

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
        });

        emitBlockedChatUsageEvent({
          userId,
          taskId: persistedTask._id,
          personaId: selectedPersona.id,
          planName,
          stopReason,
        });

        return NextResponse.json(
          createStopResponsePayload({
            taskData,
            taskId: persistedTask._id,
            personaId: selectedPersona.id,
            stopReason,
            endAction,
            acceptedPrompt: false,
          }),
          { status: 403 },
        );
      }

      const taskData = createStopTaskData({
        stopReason,
        endAction,
      });

      emitBlockedChatUsageEvent({
        userId,
        personaId: selectedPersona.id,
        planName,
        stopReason,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData,
          personaId: selectedPersona.id,
          stopReason,
          endAction,
          acceptedPrompt: false,
        }),
        { status: 403 },
      );
    }

    let taskId = providedTaskId;
    const isNewConversation = !taskId;

    if (!taskId) {
      const generatedTitle = await generateTitle(
        promptPayloadMessages,
        planName,
        selectedPersona.id,
      );
      const {
        title,
        usage,
        requestMetric: titleRequestMetric,
      } = JSON.parse(generatedTitle as string) as TitleResponsePayload;

      const newTask = await createTask({
        title,
        messages: storedMessagesWithIncomingPrompt,
        usage,
        personaId: selectedPersona.id,
        promptCount: 1,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
      });

      if (!newTask) {
        throw new Error("Task creation failed.");
      }

      const createdTaskId = newTask._id;

      if (!createdTaskId) {
        throw new Error("Created task is missing an identifier.");
      }

      taskId = createdTaskId;

      if (titleRequestMetric) {
        emitUsageEvents({
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

    const aiResponse = await generateResponse({
      messages: promptPayloadMessages,
      taskId,
      userId,
      personaId: selectedPersona.id,
      planName,
      entitlements: resolvedEntitlements,
    });
    const aiPayload = JSON.parse(aiResponse as string) as OpenAIResponsePayload;

    if (aiPayload.requestMetrics?.length) {
      emitUsageEvents({
        userId,
        taskId,
        personaId: selectedPersona.id,
        metrics: aiPayload.requestMetrics,
      });
    }

    if (aiPayload.errorType) {
      return NextResponse.json(
        { error: OPENAI_ERROR_MESSAGES[aiPayload.errorType] },
        { status: OPENAI_ERROR_STATUS_MAP[aiPayload.errorType] },
      );
    }

    const { taskData, taskUsage, generatedImage, generatedAudio } = aiPayload;

    if (aiPayload.blockedReason === "media_limit_reached") {
      const stopReason: TaskEndedReason = "media_limit_reached";
      const endAction = getPlanBoundEndAction(planName);
      const taskDataToPersist = await persistConversationStop({
        taskId,
        personaId: selectedPersona.id,
        currentMessages: storedMessagesWithIncomingPrompt,
        stopReason,
        endAction,
        promptCountIncrement: isNewConversation ? 0 : 1,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData: taskDataToPersist,
          taskId,
          personaId: selectedPersona.id,
          stopReason,
          endAction,
          acceptedPrompt: true,
        }),
        { status: 403 },
      );
    }

    if (!taskData) {
      throw new Error("AI response payload is missing task data.");
    }

    const storedMessagesWithAssistant = [
      ...storedMessagesWithIncomingPrompt,
      taskData,
    ];
    const estimatedBytesWithAssistant = estimateConversationBytes(
      storedMessagesWithAssistant,
    );

    if (estimatedBytesWithAssistant > TASK_STORAGE_WARNING_BYTES) {
      const stopReason: TaskEndedReason = "conversation_storage_limit_reached";
      const endAction: TaskEndAction = "start_new_conversation";
      const taskDataToPersist = await persistConversationStop({
        taskId,
        personaId: selectedPersona.id,
        currentMessages: storedMessagesWithIncomingPrompt,
        stopReason,
        endAction,
        promptCountIncrement: isNewConversation ? 0 : 1,
        estimatedBytes: estimatedBytesWithIncomingPrompt,
      });

      emitBlockedChatUsageEvent({
        userId,
        taskId,
        personaId: selectedPersona.id,
        planName,
        stopReason,
      });

      return NextResponse.json(
        createStopResponsePayload({
          taskData: taskDataToPersist,
          taskId,
          personaId: selectedPersona.id,
          stopReason,
          endAction,
          acceptedPrompt: true,
        }),
        { status: 403 },
      );
    }

    await updateTask(taskId, {
      messages: storedMessagesWithAssistant,
      usage: taskUsage ?? 0,
      personaId: selectedPersona.id,
      promptCountIncrement: isNewConversation ? 0 : 1,
      estimatedBytes: estimatedBytesWithAssistant,
    });

    const usageIncrementFields: Record<string, number> = {};
    if (generatedImage) {
      usageIncrementFields["plan.imageGenerations"] = 1;
    }
    if (generatedAudio) {
      usageIncrementFields["plan.audioGenerations"] = 1;
    }

    if (Object.keys(usageIncrementFields).length > 0) {
      const counterUpdate: {
        $inc: Record<string, number>;
        $set?: Record<string, Date>;
      } = {
        $inc: usageIncrementFields,
      };

      if (!userData?.plan?.usagePeriodStart) {
        counterUpdate.$set = {
          "plan.usagePeriodStart": new Date(),
        };
      }

      await User.findOneAndUpdate({ clerkId: userId }, counterUpdate, {
        strict: true,
        upsert: false,
      });
    }

    return NextResponse.json({
      taskData,
      taskId,
      personaId: selectedPersona.id,
      acceptedPrompt: true,
    });
  } catch {
    return NextResponse.json(
      { error: OPENAI_ERROR_MESSAGES.unknown },
      { status: OPENAI_ERROR_STATUS_MAP.unknown },
    );
  }
}
