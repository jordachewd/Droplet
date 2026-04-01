"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { useShallow } from "zustand/react/shallow";
import { Message } from "@/types";
import ChatIntro from "@/components/chat/chat-intro";
import ChatBody from "@/components/chat/chat-body";
import ChatInput from "@/components/chat/chat-input";
import AlertMessage from "@/components/shared/alert-message";
import { AlertParams } from "@/types/AlertData.d";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import {
  ensureMessageHasId,
  ensureMessagesHaveId,
} from "@/lib/utils/message-id";
import { Persona, PersonaId } from "@/types/PersonaData.d";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";
import { useChatStore } from "@/lib/hooks/use-chat-store";
import { usePreferencesStore } from "@/lib/hooks/use-preferences-store";
import type { ChatApiResponse, ChatStreamEvent } from "@/types/chat-api";

interface ChatWrapperProps {
  personas: Persona[];
  supportEmail: string;
  stopReasonMessages: Record<TaskEndedReason, string>;
  initialPersonaId?: string;
  allowedPersonaIds?: PersonaId[];
  initialTaskId?: string | null;
  initialMessages?: Message[];
  initialTaskStatus?: TaskStatus;
  initialEndedReason?: TaskEndedReason;
  initialEndAction?: TaskEndAction;
}

const STREAM_REQUEST_TIMEOUT_MS = 70_000;
const STREAM_REQUEST_TIMEOUT_MESSAGE =
  "The response timed out. Please try again.";
const STREAM_PROACTIVE_TIMEOUT_MESSAGE =
  "Your request is taking longer than expected. Media generation may still be processing in the background. Please check your library or start a new conversation.";
const STREAM_PROACTIVE_TIMEOUT_TITLE = "Request taking longer than expected";

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function isTimeoutAbortReason(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === "TimeoutError";
}

export default function ChatWrapper({
  personas,
  supportEmail,
  stopReasonMessages,
  initialPersonaId,
  allowedPersonaIds,
  initialTaskId = null,
  initialMessages: initialMessagesProp,
  initialTaskStatus = "active",
  initialEndedReason,
  initialEndAction,
}: ChatWrapperProps) {
  const initialMessages = useMemo(
    () => ensureMessagesHaveId(initialMessagesProp ?? []),
    [initialMessagesProp],
  );
  const fallbackPersona = personas[0];
  if (!fallbackPersona) {
    throw new Error("ChatWrapper requires at least one persona.");
  }
  const fallbackPersonaId = fallbackPersona.id;
  const personaMap = useMemo(
    () =>
      personas.reduce(
        (accumulator, persona) => {
          accumulator[persona.id] = persona;
          return accumulator;
        },
        {} as Record<PersonaId, Persona>,
      ),
    [personas],
  );
  const normalizedAllowedPersonaIds = useMemo(() => {
    if (allowedPersonaIds !== undefined) {
      return allowedPersonaIds;
    }

    return personas.map((persona) => persona.id);
  }, [allowedPersonaIds, personas]);

  const resolveSelectablePersonaId = useCallback(
    (candidatePersonaId?: string | null): PersonaId => {
      const resolvedPersonaId =
        (candidatePersonaId as PersonaId | undefined) &&
        personaMap[candidatePersonaId as PersonaId]
          ? (candidatePersonaId as PersonaId)
          : fallbackPersonaId;

      if (normalizedAllowedPersonaIds.includes(resolvedPersonaId)) {
        return resolvedPersonaId;
      }

      return normalizedAllowedPersonaIds[0] ?? fallbackPersonaId;
    },
    [fallbackPersonaId, normalizedAllowedPersonaIds, personaMap],
  );

  const {
    isLoading,
    taskId: dbTaskId,
    messages: task,
    taskStatus,
    endState,
    hydrateConversation,
    setTaskId,
    setPersonaId,
    setMessages,
    setIsLoading,
    setTaskStatus,
    setEndState,
  } = useChatStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      taskId: state.taskId,
      messages: state.messages,
      taskStatus: state.taskStatus,
      endState: state.endState,
      hydrateConversation: state.hydrateConversation,
      setTaskId: state.setTaskId,
      setPersonaId: state.setPersonaId,
      setMessages: state.setMessages,
      setIsLoading: state.setIsLoading,
      setTaskStatus: state.setTaskStatus,
      setEndState: state.setEndState,
    })),
  );
  const { preferredPersonaId, setPreferredPersonaId } = usePreferencesStore(
    useShallow((state) => ({
      preferredPersonaId: state.preferredPersonaId,
      setPreferredPersonaId: state.setPreferredPersonaId,
    })),
  );
  const [alert, setAlert] = useState<AlertParams | null>(null);
  const [startMsg, setStartMsg] = useState<string>("");
  const initialEndState = useMemo(
    () =>
      initialTaskStatus === "ended" && initialEndedReason && initialEndAction
        ? {
            stopReason: initialEndedReason,
            endAction: initialEndAction,
          }
        : null,
    [initialEndAction, initialEndedReason, initialTaskStatus],
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>(
    resolveSelectablePersonaId(initialPersonaId ?? preferredPersonaId),
  );
  const nextAlertId = useRef<number>(0);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const isConversationEnded = taskStatus === "ended";
  const isNewTask = task.length === 0 && !isConversationEnded;

  const selectedPersona = useMemo(
    () => personaMap[selectedPersonaId] ?? fallbackPersona,
    [personaMap, selectedPersonaId, fallbackPersona],
  );

  useEffect(() => {
    hydrateConversation({
      taskId: initialTaskId,
      messages: initialMessages,
      taskStatus: initialTaskStatus,
      endState: initialEndState,
    });
  }, [
    hydrateConversation,
    initialEndState,
    initialMessages,
    initialTaskId,
    initialTaskStatus,
  ]);

  useEffect(() => {
    setSelectedPersonaId(
      resolveSelectablePersonaId(initialPersonaId ?? preferredPersonaId),
    );
  }, [initialPersonaId, preferredPersonaId, resolveSelectablePersonaId]);

  useEffect(() => {
    setPreferredPersonaId(selectedPersonaId);
  }, [selectedPersonaId, setPreferredPersonaId]);

  useEffect(() => {
    setPersonaId(selectedPersonaId);
    return () => setPersonaId(null);
  }, [selectedPersonaId, setPersonaId]);

  useEffect(
    () => () => {
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = null;
    },
    [],
  );

  function syncMessagesWithResponse({
    taskData,
    acceptedPrompt = true,
  }: {
    taskData?: Message;
    acceptedPrompt?: boolean;
  }) {
    setMessages((previousMessages) => {
      const withoutTemp = previousMessages.slice(0, -1);
      const baseMessages = acceptedPrompt
        ? withoutTemp
        : withoutTemp.slice(0, -1);
      const normalizedTaskData = taskData ? ensureMessageHasId(taskData) : null;

      return normalizedTaskData
        ? [...baseMessages, normalizedTaskData]
        : baseMessages;
    });
  }

  function handleConversationStop(responseData: ChatApiResponse) {
    syncMessagesWithResponse({
      taskData: responseData.taskData,
      acceptedPrompt: responseData.acceptedPrompt,
    });
    setTaskStatus("ended");

    if (responseData.stopReason && responseData.endAction) {
      setEndState({
        stopReason: responseData.stopReason,
        endAction: responseData.endAction,
      });
    }

    if (responseData.taskId) {
      setTaskId(responseData.taskId);
    }

    setIsLoading(false);
  }

  function handleNonTerminalConversationStop(responseData: ChatApiResponse) {
    syncMessagesWithResponse({
      taskData: responseData.taskData,
      acceptedPrompt: responseData.acceptedPrompt,
    });
    setTaskStatus("active");
    setEndState(null);

    if (responseData.taskId) {
      setTaskId(responseData.taskId);
    }

    setIsLoading(false);
  }

  function syncStreamingMessage(snapshot: string) {
    setMessages((previousMessages) => {
      if (previousMessages.length === 0) {
        return [
          ensureMessageHasId({
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: snapshot }],
          }),
        ];
      }

      const updatedMessages = [...previousMessages];
      const previousStreamingMessage =
        updatedMessages[updatedMessages.length - 1];
      const streamingTaskData: Message = {
        id: previousStreamingMessage?.id,
        whois: "assistant",
        role: "assistant",
        content: [{ type: "text", text: snapshot }],
      };
      updatedMessages[updatedMessages.length - 1] = streamingTaskData;

      return updatedMessages;
    });
  }

  function parseStreamEvent(rawEvent: string): ChatStreamEvent | null {
    const dataLine = rawEvent
      .split("\n")
      .find((line) => line.startsWith("data: "));

    if (!dataLine) {
      return null;
    }

    try {
      return JSON.parse(dataLine.slice(6)) as ChatStreamEvent;
    } catch {
      return null;
    }
  }

  async function consumeStreamingResponse(
    response: Response,
    options?: {
      onStreamEvent?: () => void;
    },
  ) {
    if (!response.body) {
      showAlert("Error", "Invalid server response.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalEventReceived = false;

    const handleEvent = (event: ChatStreamEvent | null) => {
      if (!event) {
        return;
      }

      options?.onStreamEvent?.();

      if (event.type === "meta") {
        setTaskId(event.taskId);
        return;
      }

      if (event.type === "heartbeat") {
        return;
      }

      if (event.type === "chunk") {
        syncStreamingMessage(event.snapshot);
        return;
      }

      if (event.type === "error") {
        finalEventReceived = true;

        if (event.error === STREAM_PROACTIVE_TIMEOUT_MESSAGE) {
          showAlert(STREAM_PROACTIVE_TIMEOUT_TITLE, event.error, {
            severity: "warning",
          });
          return;
        }

        showAlert("Error", event.error);
        return;
      }

      finalEventReceived = true;

      if (event.payload.stopReason && event.payload.endAction) {
        if (event.payload.taskStatus === "active") {
          handleNonTerminalConversationStop(event.payload);
        } else {
          handleConversationStop(event.payload);
        }
        return;
      }

      syncMessagesWithResponse({
        taskData: event.payload.taskData,
        acceptedPrompt: event.payload.acceptedPrompt,
      });

      if (event.payload.taskId) {
        setTaskId(event.payload.taskId);
      }

      if (event.payload.personaId) {
        setSelectedPersonaId(
          resolveSelectablePersonaId(event.payload.personaId),
        );
      }

      if (event.payload.error) {
        showAlert("Error", event.payload.error);
        return;
      }

      setIsLoading(false);
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const rawEvents = buffer.split("\n\n");
      buffer = rawEvents.pop() ?? "";

      for (const rawEvent of rawEvents) {
        handleEvent(parseStreamEvent(rawEvent));
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      handleEvent(parseStreamEvent(buffer));
    }

    if (!finalEventReceived) {
      showAlert("Error", "The response stream ended unexpectedly.");
    }
  }

  const sendMessage = async (prompt: Message) => {
    if (!prompt || isConversationEnded || isLoading) return;
    setIsLoading(true);
    setStartMsg("");

    const promptWithId = ensureMessageHasId(prompt);
    const tempPrompt: Message = {
      whois: "assistant",
      role: "assistant",
      content: [{ type: "temp", text: "Thinking ..." }],
    };
    const tempPromptWithId = ensureMessageHasId(tempPrompt);

    setMessages((previousMessages) => [
      ...previousMessages,
      promptWithId,
      tempPromptWithId,
    ]);

    const requestAbortController = new AbortController();
    const timeoutAbortReason = new DOMException(
      "Streaming request timed out.",
      "TimeoutError",
    );
    let requestTimeoutId: number | null = null;
    const clearRequestTimeout = () => {
      if (requestTimeoutId === null) {
        return;
      }

      window.clearTimeout(requestTimeoutId);
      requestTimeoutId = null;
    };
    const resetRequestTimeout = () => {
      clearRequestTimeout();
      requestTimeoutId = window.setTimeout(() => {
        requestAbortController.abort(timeoutAbortReason);
      }, STREAM_REQUEST_TIMEOUT_MS);
    };

    resetRequestTimeout();
    activeRequestControllerRef.current = requestAbortController;

    try {
      const taskMessages = filterAssistantMsg([
        ...task,
        promptWithId,
      ] as Message[]);

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "x-droplet-stream": "1",
        },
        body: JSON.stringify({
          messages: taskMessages,
          taskId: dbTaskId,
          personaId: selectedPersona.id,
        }),
        signal: requestAbortController.signal,
      });
      const responseContentType = response.headers.get("Content-Type") ?? "";

      if (response.ok && responseContentType.includes("text/event-stream")) {
        await consumeStreamingResponse(response, {
          onStreamEvent: resetRequestTimeout,
        });
        return;
      }

      const responseData = (await response
        .json()
        .catch(() => null)) as ChatApiResponse | null;

      if (responseData?.stopReason && responseData?.endAction) {
        if (responseData.taskStatus === "active") {
          handleNonTerminalConversationStop(responseData);
        } else {
          handleConversationStop(responseData);
        }
        return;
      }

      if (!response.ok) {
        const title = response.statusText || "Request failed";
        const text =
          typeof responseData?.error === "string" && responseData.error !== ""
            ? responseData.error
            : `Error status: ${response.status}`;
        showAlert(title, text);
        return;
      }

      if (!responseData) {
        showAlert("Error", "Invalid server response.");
        return;
      }

      const { taskData, taskId, error } = responseData;

      syncMessagesWithResponse({ taskData, acceptedPrompt: true });

      if (taskId) {
        setTaskId(taskId);
      }

      if (error) {
        showAlert("Error", error);
        return;
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (isTimeoutAbortReason(requestAbortController.signal.reason)) {
          showAlert("Request timed out", STREAM_REQUEST_TIMEOUT_MESSAGE);
          return;
        }

        setMessages((previousMessages) => {
          const lastMessage = previousMessages[previousMessages.length - 1];

          if (!lastMessage || !Array.isArray(lastMessage.content)) {
            return previousMessages;
          }

          if (
            lastMessage.content.length !== 1 ||
            lastMessage.content[0]?.type !== "temp"
          ) {
            return previousMessages;
          }

          return previousMessages.slice(0, -1);
        });
        setIsLoading(false);
        return;
      }

      showAlert("Error", "Unable to send your message right now.");
    } finally {
      clearRequestTimeout();

      if (activeRequestControllerRef.current === requestAbortController) {
        activeRequestControllerRef.current = null;
      }
    }

    setIsLoading(false);
  };

  const showAlert = (
    title: string,
    text: string,
    options?: Pick<AlertParams, "severity" | "variant">,
  ) => {
    nextAlertId.current += 1;
    setAlert({
      id: nextAlertId.current,
      title,
      text,
      severity: options?.severity,
      variant: options?.variant,
    });
    setIsLoading(false);
    setMessages((previousMessages) => previousMessages.slice(0, -1));
  };

  return (
    <section className="ChatWrapper relative flex h-full flex-1 flex-col overflow-hidden -mt-14">
      {alert && <AlertMessage message={alert} />}

      <div
        id="ChatWrapperContent"
        className={classNames(
          "ChatWrapperContent relative z-10 flex w-full h-dvh flex-col overflow-y-auto pt-14 px-4",
          isNewTask && "items-center justify-center gap-12",
        )}
      >
        {isNewTask ? (
          <ChatIntro
            persona={selectedPersona}
            sendPrompt={(prompt) => setStartMsg(prompt)}
          />
        ) : (
          <ChatBody
            messages={task}
            personaLabel={selectedPersona.label}
            conversationEnded={isConversationEnded}
            supportEmail={supportEmail}
            stopReasonMessages={stopReasonMessages}
            endState={endState}
          />
        )}

        <ChatInput
          sendMessage={sendMessage}
          loading={isLoading}
          disabled={isConversationEnded}
          startPrompt={startMsg}
          personaLabel={selectedPersona.label}
        />
      </div>
    </section>
  );
}
