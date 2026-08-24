import "server-only";
import { Message, Messages } from "@/types";
import { PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndAction, TaskEndedReason } from "@/types/TaskData.d";
import { updateTask } from "@/lib/actions/task.actions";
import {
  BudgetState,
  ModelPolicyModelOverrides,
  TaskClass,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { emitUsageEvents } from "@/lib/utils/usage-event-utils";
import {
  ensureMessageHasId,
  ensureMessagesHaveId,
} from "@/lib/utils/message-id";
import type {
  OpenAIErrorType,
  OpenAIResponsePayload,
} from "@/lib/utils/openai/generateResponse";
import {
  createStopResponsePayload,
  createStopTaskData,
  estimateConversationBytes,
  getPlanBoundEndAction,
  persistConversationNotice,
  persistConversationStop,
  TASK_STORAGE_WARNING_BYTES,
  type StopReasonMessages,
} from "@/lib/utils/openai/conversation-lifecycle";
import type { ChatApiResponse } from "@/types/chat-api";

const DEFAULT_CHAT_TASK_CLASS: TaskClass = "standard";
const DEFAULT_CHAT_BUDGET_STATE: BudgetState = "normal";

export interface EmitBlockedChatUsageEventParams {
  userId: string;
  taskId?: string;
  personaId: PersonaId;
  planName?: PlanName | null;
  stopReason: TaskEndedReason;
  modelOverrides?: ModelPolicyModelOverrides;
}

export interface FinalizeAIResponseParams {
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
  openAiErrorStatusMap: Record<OpenAIErrorType, number>;
  openAiErrorMessages: Record<OpenAIErrorType, string>;
}

export interface FinalizeAIResponseResult {
  status: number;
  payload: ChatApiResponse;
}

function createUsageTaskId(taskId?: string): string {
  return taskId ?? `request_${crypto.randomUUID()}`;
}

function isMediaLimitStopReason(
  value: OpenAIResponsePayload["blockedReason"],
): value is
  | "media_limit_reached"
  | "image_limit_reached"
  | "audio_limit_reached" {
  return (
    value === "media_limit_reached" ||
    value === "image_limit_reached" ||
    value === "audio_limit_reached"
  );
}

function isMediaSpecificLimitStopReason(
  value: OpenAIResponsePayload["blockedReason"],
): value is "image_limit_reached" | "audio_limit_reached" {
  return value === "image_limit_reached" || value === "audio_limit_reached";
}

export function getLatestUserMessage(
  messages: Messages["messages"],
): Message | null {
  const latestMessage = messages.at(-1);

  if (!latestMessage || latestMessage.role !== "user") {
    return null;
  }

  return latestMessage;
}

export function emitUsageEventsSafely(
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

export function emitBlockedChatUsageEvent({
  userId,
  taskId,
  personaId,
  planName,
  stopReason,
  modelOverrides,
}: EmitBlockedChatUsageEventParams): void {
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

export async function finalizeAIResponse({
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
  openAiErrorStatusMap,
  openAiErrorMessages,
}: FinalizeAIResponseParams): Promise<FinalizeAIResponseResult> {
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
      status: openAiErrorStatusMap[aiPayload.errorType],
      payload: {
        error:
          aiPayload.errorMessage ?? openAiErrorMessages[aiPayload.errorType],
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
