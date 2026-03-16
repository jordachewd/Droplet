"use client";

import { create } from "zustand";
import { Message } from "@/types";
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
      messages,
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
      messages:
        typeof messages === "function" ? messages(state.messages) : messages,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTaskStatus: (taskStatus) => set({ taskStatus }),
  setEndState: (endState) => set({ endState }),
}));
