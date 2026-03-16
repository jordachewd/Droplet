"use client";

import { create } from "zustand";
import { Message } from "@/types";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";

export interface ChatEndState {
  stopReason: TaskEndedReason;
  endAction: TaskEndAction;
}

interface ChatHydrationPayload {
  taskId?: string | null;
  messages?: Message[];
  taskStatus?: TaskStatus;
  endState?: ChatEndState | null;
}

interface ChatStoreState {
  taskId: string | null;
  messages: Message[];
  isLoading: boolean;
  taskStatus: TaskStatus;
  endState: ChatEndState | null;
  hydrateConversation: (payload: ChatHydrationPayload) => void;
  resetConversation: () => void;
  setTaskId: (taskId: string | null) => void;
  setMessages: (
    messages: Message[] | ((previousMessages: Message[]) => Message[]),
  ) => void;
  setIsLoading: (isLoading: boolean) => void;
  setTaskStatus: (taskStatus: TaskStatus) => void;
  setEndState: (endState: ChatEndState | null) => void;
}

export const useChatStore = create<ChatStoreState>()((set) => ({
  taskId: null,
  messages: [],
  isLoading: false,
  taskStatus: "active",
  endState: null,
  hydrateConversation: ({
    taskId = null,
    messages = [],
    taskStatus = "active",
    endState = null,
  }) =>
    set({
      taskId,
      messages,
      taskStatus,
      endState,
      isLoading: false,
    }),
  resetConversation: () =>
    set({
      taskId: null,
      messages: [],
      isLoading: false,
      taskStatus: "active",
      endState: null,
    }),
  setTaskId: (taskId) => set({ taskId }),
  setMessages: (messages) =>
    set((state) => ({
      messages:
        typeof messages === "function" ? messages(state.messages) : messages,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTaskStatus: (taskStatus) => set({ taskStatus }),
  setEndState: (endState) => set({ endState }),
}));
