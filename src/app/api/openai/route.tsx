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
  deleteTask,
  incrementPromptCountIfBelowLimit,
  updateTask,
} from "@/lib/actions/task.actions";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { UserData } from "@/types/UserData.d";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import {
  resolvePersonaForPlan,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";
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
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import { PLAN_LIMITS } from "@/constants/plans";
import { SUPPORT_EMAIL } from "@/constants/support";
import { PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import {
  BudgetState,
  TaskClass,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import {
  AIRequestMetric,
  emitUsageEvents,
} from "@/lib/utils/usage-event-utils";

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;
const TASK_STORAGE_WARNING_BYTES = 12 * 1024 * 1024;
const DEFAULT_CHAT_TASK_CLASS: TaskClass = "standard";
const DEFAULT_CHAT_BUDGET_STATE: BudgetState = "normal";
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

interface ChatApiResponse {
  taskData?: Message;
  taskId?: string;
  personaId?: PersonaId;
  error?: string;
  stopReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  taskStatus?: TaskStatus;
  acceptedPrompt?: boolean;
}

interface TitleResponsePayload {
  title: string;
  usage: number;
  requestMetric?: AIRequestMetric;
}

type OpenAIStreamEvent =
  | {
      type: "meta";
      taskId: string;
      personaId: PersonaId;
    }
  | {
      type: "chunk";
      delta: string;
      snapshot: string;
    }
  | {
      type: "final";
      payload: ChatApiResponse;
    }
  | {
      type: "error";
      error: string;
    };

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
  personaId: PersonaId;
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

function shouldStreamResponse(req: Request): boolean {
  return (
    req.headers.get("x-droplet-stream") === "1" ||
    req.headers.get("accept")?.includes("text/event-stream") === true
  );
}

function writeStreamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: OpenAIStreamEvent,
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
}: {
  userId: string;
  taskId?: string;
  personaId: PersonaId;
  planName?: PlanName | null;
  stopReason: TaskEndedReason;
}) {
  const policy = resolveModelPolicy({
    plan: normalizePlanTier(planName ?? "Lite"),
    feature: "chat",
    taskClass: DEFAULT_CHAT_TASK_CLASS,
    budgetState: DEFAULT_CHAT_BUDGET_STATE,
  });

  if (policy.hardBlocked || policy.model === "blocked") {
    return;
  }

  emitUsageEvents({
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
  estimatedBytes,
}: {
  taskId: string;
  personaId: PersonaId;
  currentMessages: Message[];
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
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

async function finalizeAIResponse({
  aiPayload,
  taskId,
  userId,
  planName,
  selectedPersonaId,
  storedMessagesWithIncomingPrompt,
  estimatedBytesWithIncomingPrompt,
  userData,
}: {
  aiPayload: OpenAIResponsePayload;
  taskId: string;
  userId: string;
  planName: PlanName;
  selectedPersonaId: PersonaId;
  storedMessagesWithIncomingPrompt: Message[];
  estimatedBytesWithIncomingPrompt: number;
  userData: UserData | null;
}): Promise<{
  status: number;
  payload: ChatApiResponse;
}> {
  if (aiPayload.requestMetrics?.length) {
    emitUsageEvents({
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

  const { taskData, taskUsage, generatedImage, generatedAudio } = aiPayload;

  if (aiPayload.blockedReason === "media_limit_reached") {
    const stopReason: TaskEndedReason = "media_limit_reached";
    const endAction = getPlanBoundEndAction(planName);
    const taskDataToPersist = await persistConversationStop({
      taskId,
      personaId: selectedPersonaId,
      currentMessages: storedMessagesWithIncomingPrompt,
      stopReason,
      endAction,
      estimatedBytes: estimatedBytesWithIncomingPrompt,
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
      }),
    };
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
      personaId: selectedPersonaId,
      currentMessages: storedMessagesWithIncomingPrompt,
      stopReason,
      endAction,
      estimatedBytes: estimatedBytesWithIncomingPrompt,
    });

    emitBlockedChatUsageEvent({
      userId,
      taskId,
      personaId: selectedPersonaId,
      planName,
      stopReason,
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
      }),
    };
  }

  await updateTask(taskId, {
    messages: storedMessagesWithAssistant,
    usage: taskUsage ?? 0,
    personaId: selectedPersonaId,
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

  return {
    status: 200,
    payload: {
      taskData,
      taskId,
      personaId: selectedPersonaId,
      acceptedPrompt: true,
    },
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const streamingResponseRequested = shouldStreamResponse(req);
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

    const planName = userData.plan?.name ?? "Lite";
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
      limitType: "images",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });
    const audioUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.audioGenerations,
      limitType: "audio",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });
    const videoUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.videoGenerations,
      limitType: "video",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });

    if (imageUsage.didReset || audioUsage.didReset || videoUsage.didReset) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        {
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
      supportsImageGeneration:
        entitlements.supportsImageGeneration && !imageLimitReached,
      supportsAudioGeneration:
        entitlements.supportsAudioGeneration && !audioLimitReached,
      supportsVideoGeneration:
        entitlements.supportsVideoGeneration && !videoLimitReached,
      imageLimitReached,
      audioLimitReached,
      videoLimitReached,
    };

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

    if (persistedTask && PLAN_LIMITS[planName].promptsPerConversation !== -1) {
      const promptLimit = PLAN_LIMITS[planName].promptsPerConversation;
      const promptSlotClaimed = await incrementPromptCountIfBelowLimit({
        taskId: persistedTask._id,
        limit: promptLimit,
      });

      if (!promptSlotClaimed) {
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
    }

    let taskId = providedTaskId;

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

      const dailyConversationLimit = await checkDailyConversationLimit(
        userId,
        planName,
      );

      if (!dailyConversationLimit.allowed) {
        await deleteTask(createdTaskId);

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

    const chatTaskClass = classifyTaskComplexity({
      messages: promptPayloadMessages,
      latestUserMessage,
    });
    const explicitPremiumRequested =
      chatTaskClass === "complex" &&
      isExplicitDeepAnalysisRequest(latestUserMessage);

    if (streamingResponseRequested) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            writeStreamEvent(controller, {
              type: "meta",
              taskId,
              personaId: selectedPersona.id,
            });

            const aiPayload = await generateStreamingResponse({
              messages: promptPayloadMessages,
              taskId,
              userId,
              personaId: selectedPersona.id,
              planName,
              entitlements: resolvedEntitlements,
              taskClass: chatTaskClass,
              budgetState: DEFAULT_CHAT_BUDGET_STATE,
              explicitPremium: explicitPremiumRequested,
              abortSignal: req.signal,
              onContentChunk: (delta, snapshot) => {
                writeStreamEvent(controller, {
                  type: "chunk",
                  delta,
                  snapshot,
                });
              },
            });

            const finalResult = await finalizeAIResponse({
              aiPayload,
              taskId,
              userId,
              planName,
              selectedPersonaId: selectedPersona.id,
              storedMessagesWithIncomingPrompt,
              estimatedBytesWithIncomingPrompt,
              userData,
            });

            if (finalResult.payload.error && !finalResult.payload.taskData) {
              writeStreamEvent(controller, {
                type: "error",
                error: finalResult.payload.error,
              });
            } else {
              writeStreamEvent(controller, {
                type: "final",
                payload: finalResult.payload,
              });
            }
          } catch {
            writeStreamEvent(controller, {
              type: "error",
              error: OPENAI_ERROR_MESSAGES.unknown,
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: STREAM_HEADERS,
      });
    }

    const aiResponse = await generateResponse({
      messages: promptPayloadMessages,
      taskId,
      userId,
      personaId: selectedPersona.id,
      planName,
      entitlements: resolvedEntitlements,
      taskClass: chatTaskClass,
      budgetState: DEFAULT_CHAT_BUDGET_STATE,
      explicitPremium: explicitPremiumRequested,
    });
    const aiPayload = JSON.parse(aiResponse as string) as OpenAIResponsePayload;

    const finalResult = await finalizeAIResponse({
      aiPayload,
      taskId,
      userId,
      planName,
      selectedPersonaId: selectedPersona.id,
      storedMessagesWithIncomingPrompt,
      estimatedBytesWithIncomingPrompt,
      userData,
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
