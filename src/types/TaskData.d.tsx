// ====== Task Data Types
import { Message } from "@/types";
import { PersonaId } from "@/types/PersonaData.d";

export type TaskStatus = "active" | "ended";

export type TaskEndedReason =
  | "prompt_limit_reached"
  | "trial_limit_reached"
  | "media_limit_reached"
  | "daily_conversation_limit_reached"
  | "conversation_storage_limit_reached"
  | "billing_state_invalid";

export type TaskEndAction =
  | "start_new_conversation"
  | "upgrade_plan"
  | "contact_support";

export interface CreateTaskInput {
  usage?: number;
  title: string;
  messages: Message[];
  personaId?: PersonaId;
  promptCount?: number;
  mediaCount?: number;
  estimatedBytes?: number;
  status?: TaskStatus;
  endedAt?: Date;
  endedReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateTaskParams {
  messages: Message[];
  usage?: number;
  personaId?: PersonaId;
  promptCount?: number;
  mediaCount?: number;
  estimatedBytes?: number;
  status?: TaskStatus;
  endedAt?: Date;
  endedReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  updatedAt?: Date;
}

export interface TaskHistoryItem {
  _id: string;
  title: string;
  personaId: PersonaId;
  updatedAt: string;
}

export interface TaskConversation {
  _id: string;
  title: string;
  personaId: PersonaId;
  messages: Message[];
  usage: number;
  promptCount: number;
  mediaCount: number;
  estimatedBytes: number;
  status: TaskStatus;
  endedAt?: string;
  endedReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  updatedAt: string;
}
