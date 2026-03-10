// ====== Task Data Types
import { Message } from "@/types";
import { PersonaId } from "@/types/PersonaData.d";

export interface CreateTaskInput {
  usage?: number;
  title: string;
  messages: Message[];
  personaId?: PersonaId;
  createdAt?: Date;
}

export interface CreateTaskParams extends CreateTaskInput {
  userId: string;
}

export interface UpdateTaskParams {
  messages: Message[];
  usage?: number;
  personaId?: PersonaId;
}

export interface TaskHistoryItem {
  _id: string;
  title: string;
  personaId: PersonaId;
  updatedAt: string;
}
