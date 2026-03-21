"use client";

import { create } from "zustand";
import { Message } from "@/types";
import { ensureMessagesHaveId } from "@/lib/utils/message-id";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";

export interface ChatEndState {
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
}

interface ChatHydrationPayload {
  taskId?: string | null;
  personaId?: PersonaId | null;
  messages?: Message[];
  taskStatus?: TaskStatus;
  endState?: ChatEndState | null;
}

interface ChatStoreState {
  taskId: string | null;
  personaId: PersonaId | null;
  messages: Message[];
  isLoading: boolean;
  taskStatus: TaskStatus;
  endState: ChatEndState | null;
  hydrateConversation: (payload: ChatHydrationPayload) => void;
  resetConversation: () => void;
  setTaskId: (taskId: string | null) => void;
  setPersonaId: (personaId: PersonaId | null) => void;
  setMessages: (
    messages: Message[] | ((previousMessages: Message[]) => Message[]),
  ) => void;
  setIsLoading: (isLoading: boolean) => void;
  setTaskStatus: (taskStatus: TaskStatus) => void;
  setEndState: (endState: ChatEndState | null) => void;
}

export const useChatStore = create<ChatStoreState>()((set) => ({
  taskId: null,
  personaId: null,
  messages: [],
  isLoading: false,
  taskStatus: "active",
  endState: null,
  hydrateConversation: ({
    taskId = null,
    personaId = null,
    messages = [],
    taskStatus = "active",
    endState = null,
  }) =>
    set({
      taskId,
      personaId,
      messages: ensureMessagesHaveId(messages),
      taskStatus,
      endState,
      isLoading: false,
    }),
  resetConversation: () =>
    set({
      taskId: null,
      personaId: null,
      messages: [],
      isLoading: false,
      taskStatus: "active",
      endState: null,
    }),
  setTaskId: (taskId) => set({ taskId }),
  setPersonaId: (personaId) => set({ personaId }),
  setMessages: (messages) =>
    set((state) => ({
      // Keep keys stable by ensuring every message has a durable ID.
      messages:
        typeof messages === "function"
          ? ensureMessagesHaveId(messages(state.messages))
          : ensureMessagesHaveId(messages),
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTaskStatus: (taskStatus) => set({ taskStatus }),
  setEndState: (endState) => set({ endState }),
}));
