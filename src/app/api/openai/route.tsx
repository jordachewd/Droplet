import { NextResponse } from "next/server";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { TaskEndAction, TaskEndedReason } from "@/types/TaskData.d";
import { createTask } from "@/lib/actions/task.actions";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { UserData } from "@/types/UserData.d";
import { connectToDatabase } from "@/lib/database/mongoose";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";
import { getPersona } from "@/constants/assistant-personas";
import User from "@/lib/database/models/user.model";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";
import type { OpenAIErrorType } from "@/lib/utils/openai/generateResponse";
import {
  classifyTaskComplexity,
  isExplicitDeepAnalysisRequest,
} from "@/lib/utils/openai/classify-task-complexity";
import { claimDailyConversationSlot } from "@/lib/utils/check-daily-conversations";
import {
  getTaskByIdForUser,
  incrementPromptCountIfBelowLimit,
} from "@/lib/utils/task-queries";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import { ensureMessagesHaveId } from "@/lib/utils/message-id";
import {
  BudgetState,
  ModelPolicyModelOverrides,
} from "@/lib/utils/ai-model-policy";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectiveModelConfig } from "@/lib/utils/effective-model-config";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";
import {
  claimMediaGenerationSlot,
  rollbackMediaGenerationSlot,
} from "@/lib/utils/openai/media-slot";
import {
  createStopResponsePayload,
  createStopTaskData,
  estimateConversationBytes,
  getPlanBoundEndAction,
  persistConversationStop,
  resolvePromptLimitEndAction,
  TASK_STORAGE_WARNING_BYTES,
} from "@/lib/utils/openai/conversation-lifecycle";
import {
  chatMessageArraySchema,
  nonEmptyStringSchema,
} from "@/lib/utils/validation-schemas";
import {
  createOpenAiChatStreamResponse,
  shouldStreamResponse,
} from "@/lib/utils/openai/stream-orchestrator";
import {
  emitBlockedChatUsageEvent,
  emitUsageEventsSafely,
  finalizeAIResponse,
  getLatestUserMessage,
} from "@/lib/utils/openai/route-helpers";
import { z } from "zod";

export const maxDuration = 60;

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_CHAT_BUDGET_STATE: BudgetState = "normal";

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

const openAiRequestBodySchema = z
  .object({
    messages: chatMessageArraySchema.min(1),
    taskId: nonEmptyStringSchema.nullable().optional(),
    personaId: nonEmptyStringSchema.nullable().optional(),
  })
  .strict();

type OpenAiRequestBody = z.infer<typeof openAiRequestBodySchema>;

export async function POST(req: Request): Promise<Response> {
  const functionStartTime = Date.now();

  try {
    const streamingResponseRequested = shouldStreamResponse(req);
    let rawRequestBody: unknown;

    try {
      rawRequestBody = await req.json();
    } catch (error) {
      process.stderr.write(
        `[openai/route] request json parse failed: ${error instanceof Error ? error.message : "unknown"}\n`,
      );
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

    await connectToDatabase();

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
    if (imageUsage.didReset || audioUsage.didReset) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        isTrialPersona
          ? {
              $set: {
                "plan.trialUsage.trialImageGenerations": 0,
                "plan.trialUsage.trialAudioGenerations": 0,
                "plan.trialUsage.trialUsagePeriodStart": new Date(),
              },
            }
          : {
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
      imageLimitReached,
      audioLimitReached,
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

      let generatedTitle: Awaited<ReturnType<typeof generateTitle>>;
      try {
        generatedTitle = await generateTitle(
          promptPayloadMessages,
          planName,
          selectedPersona.id,
          modelOverrides,
        );
      } catch (titleError) {
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
            `[openai/route] daily slot rollback failed after title generation error: ${rollbackError instanceof Error ? rollbackError.message : "unknown"}\n`,
          );
        }
        throw titleError;
      }
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
            `[openai/route] daily slot rollback failed after createTask error: ${rollbackError instanceof Error ? rollbackError.message : "unknown"}\n`,
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
    } as const;

    if (streamingResponseRequested) {
      return createOpenAiChatStreamResponse({
        functionStartTime,
        maxDurationSeconds: maxDuration,
        taskId,
        personaId: selectedPersona.id,
        unknownErrorMessage: OPENAI_ERROR_MESSAGES.unknown,
        runStreamPipeline: async ({
          onContentChunk,
          onMediaGenerationStart,
          onMediaGenerationEnd,
        }) => {
          const aiPayload = await generateStreamingResponse({
            messages: promptPayloadMessages,
            taskId,
            userId,
            personaId: selectedPersona.id,
            planName,
            entitlements: resolvedEntitlements,
            userPreferences: userData.preferences,
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
            onContentChunk,
            onMediaGenerationStart,
            onMediaGenerationEnd,
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
            openAiErrorStatusMap: OPENAI_ERROR_STATUS_MAP,
            openAiErrorMessages: OPENAI_ERROR_MESSAGES,
          });

          return finalResult.payload;
        },
      });
    }

    const aiPayload = await generateResponse({
      messages: promptPayloadMessages,
      taskId,
      userId,
      personaId: selectedPersona.id,
      planName,
      entitlements: resolvedEntitlements,
      userPreferences: userData.preferences,
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
      openAiErrorStatusMap: OPENAI_ERROR_STATUS_MAP,
      openAiErrorMessages: OPENAI_ERROR_MESSAGES,
    });

    return NextResponse.json(finalResult.payload, {
      status: finalResult.status,
    });
  } catch (error) {
    process.stderr.write(
      `[openai/route] request handling failed: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
    return NextResponse.json(
      { error: OPENAI_ERROR_MESSAGES.unknown },
      { status: OPENAI_ERROR_STATUS_MAP.unknown },
    );
  }
}
