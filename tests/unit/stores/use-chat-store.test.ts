import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "@/lib/hooks/use-chat-store";
import type { Message } from "@/types";

function resetChatStoreState() {
  useChatStore.setState({
    taskId: null,
    personaId: null,
    messages: [],
    isLoading: false,
    taskStatus: "active",
    endState: null,
  });
}

describe("useChatStore", () => {
  beforeEach(() => {
    resetChatStoreState();
  });

  it("starts with the expected initial state", () => {
    const state = useChatStore.getState();

    expect(state.taskId).toBeNull();
    expect(state.personaId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.taskStatus).toBe("active");
    expect(state.endState).toBeNull();
  });

  it("hydrates a conversation payload and assigns message IDs", () => {
    useChatStore.getState().hydrateConversation({
      taskId: "task_123",
      personaId: "developer",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        } satisfies Message,
      ],
      taskStatus: "ended",
      endState: {
        stopReason: "prompt_limit_reached",
        endAction: "start_new_conversation",
      },
    });

    const state = useChatStore.getState();

    expect(state.taskId).toBe("task_123");
    expect(state.personaId).toBe("developer");
    expect(state.taskStatus).toBe("ended");
    expect(state.endState).toEqual({
      stopReason: "prompt_limit_reached",
      endAction: "start_new_conversation",
    });
    expect(state.messages).toHaveLength(1);
    expect(typeof state.messages[0]?.id).toBe("string");
    expect(state.messages[0]?.id?.length).toBeGreaterThan(0);
  });

  it("supports setMessages with updater functions and keeps IDs on each message", () => {
    useChatStore.getState().setMessages([
      {
        role: "assistant",
        content: [{ type: "text", text: "First" }],
      },
    ]);

    const firstMessageId = useChatStore.getState().messages[0]?.id;
    expect(typeof firstMessageId).toBe("string");

    useChatStore.getState().setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        content: [{ type: "text", text: "Second" }],
      },
    ]);

    const updatedMessages = useChatStore.getState().messages;

    expect(updatedMessages).toHaveLength(2);
    expect(updatedMessages.every((message) => Boolean(message.id))).toBe(true);
    expect(updatedMessages[0]?.id).toBe(firstMessageId);
  });

  it("resets conversation state back to defaults", () => {
    useChatStore.getState().hydrateConversation({
      taskId: "task_abc",
      personaId: "strategist",
      messages: [{ role: "user", content: "Message" }],
      taskStatus: "ended",
      endState: {
        stopReason: "billing_state_invalid",
        endAction: "upgrade_plan",
      },
    });
    useChatStore.getState().setIsLoading(true);

    useChatStore.getState().resetConversation();

    const state = useChatStore.getState();
    expect(state.taskId).toBeNull();
    expect(state.personaId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.taskStatus).toBe("active");
    expect(state.endState).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
