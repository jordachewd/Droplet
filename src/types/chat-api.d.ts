import { Message } from "@/types";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";

export interface ChatApiResponse {
  taskData?: Message;
  taskId?: string;
  personaId?: PersonaId;
  error?: string;
  stopReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  taskStatus?: TaskStatus;
  acceptedPrompt?: boolean;
}

export type ChatStreamEvent =
  | {
      type: "meta";
      taskId: string;
      personaId: PersonaId;
    }
  | {
      type: "heartbeat";
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
