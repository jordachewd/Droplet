// ====== Task Data Types
import { Message } from "@/types";
import { AssistantRoleId } from "@/types/AssistantRoleData.d";

export interface CreateTaskInput {
  usage?: number;
  title: string;
  messages: Message[];
  assistantRoleId?: AssistantRoleId;
  createdAt?: Date;
}

export interface CreateTaskParams extends CreateTaskInput {
  userId: string;
}

export interface UpdateTaskParams {
  messages: Message[];
  usage?: number;
  assistantRoleId?: AssistantRoleId;
}

export interface TaskHistoryItem {
  _id: string;
  title: string;
  assistantRoleId: AssistantRoleId;
  usage: number;
  updatedAt: string;
}
