import "server-only";
import { Message } from "@/types";
import { PlanLimits } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import {
  TaskEndAction,
  TaskEndedReason,
  TaskStatus,
  UpdateTaskParams,
} from "@/types/TaskData.d";
import { updateTask } from "@/lib/actions/task.actions";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import {
  ensureMessageHasId,
  ensureMessagesHaveId,
} from "@/lib/utils/message-id";

export const TASK_STORAGE_WARNING_BYTES = 12 * 1024 * 1024;

export type StopReasonMessages = Record<TaskEndedReason, string>;

export interface ConversationStopPayload {
  taskData: Message;
  taskId?: string;
  personaId: PersonaId;
  error: string;
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
  taskStatus: TaskStatus;
  acceptedPrompt: boolean;
}

function buildEndActionInstructions(
  supportEmail: string,
): Record<TaskEndAction, string> {
  return {
    start_new_conversation: "Start a new conversation to continue.",
    upgrade_plan: "Upgrade your plan to continue.",
    contact_support: `Contact support at ${supportEmail}.`,
  };
}

export function estimateConversationBytes(messages: Message[]): number {
  if (messages.length === 0) {
    return 0;
  }

  return Buffer.byteLength(JSON.stringify(messages), "utf8");
}

export function createStopTaskData({
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
    stopReason !== "audio_limit_reached";
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

export function createStopResponsePayload({
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

export function getPlanBoundEndAction({
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

export async function resolvePromptLimitEndAction({
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

export async function persistConversationStop({
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

export async function persistConversationNotice({
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
