"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { Message } from "@/types";
import ChatHeader from "@/components/chat/chat-header";
import ChatIntro from "@/components/chat/chat-intro";
import ChatBody from "@/components/chat/chat-body";
import ChatInput from "@/components/chat/chat-input";
import AlertMessage, { AlertParams } from "@/components/shared/alert-message";
import { filterAssistantMsg } from "@/lib/utils/openai/filterAssistantMsg";
import ChatPersonaPicker from "@/components/chat/chat-persona-picker";
import { getPersona } from "@/constants/assistant-personas";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndAction, TaskEndedReason, TaskStatus } from "@/types/TaskData.d";

interface ChatWrapperProps {
  initialPersonaId?: string;
  initialTaskId?: string | null;
  initialMessages?: Message[];
  initialTaskStatus?: TaskStatus;
  initialEndedReason?: TaskEndedReason;
  initialEndAction?: TaskEndAction;
}

interface ChatApiResponse {
  taskData?: Message;
  taskId?: string;
  personaId?: PersonaId;
  error?: string;
  stopReason?: TaskEndedReason;
  endAction?: TaskEndAction;
  taskStatus?: TaskStatus;
  acceptedPrompt?: boolean;
}

type ChatStreamEvent =
  | {
      type: "meta";
      taskId: string;
      personaId: PersonaId;
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

export default function ChatWrapper({
  initialPersonaId,
  initialTaskId = null,
  initialMessages = [],
  initialTaskStatus = "active",
  initialEndedReason,
  initialEndAction,
}: ChatWrapperProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertParams | null>(null);
  const [startMsg, setStartMsg] = useState<string>("");
  const [dbTaskId, setDbTaskId] = useState<string | null>(initialTaskId);
  const [task, setTask] = useState<Message[]>(initialMessages);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(initialTaskStatus);
  const [endState, setEndState] = useState<{
    stopReason: TaskEndedReason;
    endAction: TaskEndAction;
  } | null>(
    initialTaskStatus === "ended" && initialEndedReason && initialEndAction
      ? {
          stopReason: initialEndedReason,
          endAction: initialEndAction,
        }
      : null,
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>(
    getPersona(initialPersonaId).id,
  );
  const nextAlertId = useRef<number>(0);
  const isConversationEnded = taskStatus === "ended";
  const isNewTask = task.length === 0 && !isConversationEnded;

  const selectedPersona = useMemo(
    () => getPersona(selectedPersonaId),
    [selectedPersonaId],
  );

  useEffect(() => {
    setSelectedPersonaId(getPersona(initialPersonaId).id);
  }, [initialPersonaId]);

  function handleSelectPersona(personaId: PersonaId) {
    if (personaId === selectedPersonaId) {
      return;
    }

    setSelectedPersonaId(personaId);
    setTask([]);
    setDbTaskId(null);
    setStartMsg("");
    setTaskStatus("active");
    setEndState(null);
  }

  function syncMessagesWithResponse({
    taskData,
    acceptedPrompt = true,
  }: {
    taskData?: Message;
    acceptedPrompt?: boolean;
  }) {
    setTask((prev) => {
      const withoutTemp = prev.slice(0, -1);
      const baseMessages = acceptedPrompt
        ? withoutTemp
        : withoutTemp.slice(0, -1);

      return taskData ? [...baseMessages, taskData] : baseMessages;
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
      setDbTaskId(responseData.taskId);
    }

    setIsLoading(false);
  }

  function syncStreamingMessage(snapshot: string) {
    const streamingTaskData: Message = {
      whois: "assistant",
      role: "assistant",
      content: [{ type: "text", text: snapshot }],
    };

    setTask((prev) => {
      if (prev.length === 0) {
        return [streamingTaskData];
      }

      const updatedMessages = [...prev];
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

  async function consumeStreamingResponse(response: Response) {
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

      if (event.type === "meta") {
        setDbTaskId(event.taskId);
        return;
      }

      if (event.type === "chunk") {
        syncStreamingMessage(event.snapshot);
        return;
      }

      if (event.type === "error") {
        showAlert("Error", event.error);
        finalEventReceived = true;
        return;
      }

      finalEventReceived = true;

      if (event.payload.stopReason && event.payload.endAction) {
        handleConversationStop(event.payload);
        return;
      }

      syncMessagesWithResponse({
        taskData: event.payload.taskData,
        acceptedPrompt: event.payload.acceptedPrompt,
      });

      if (event.payload.taskId) {
        setDbTaskId(event.payload.taskId);
      }

      if (event.payload.personaId) {
        setSelectedPersonaId(event.payload.personaId);
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

    const tempPrompt: Message = {
      whois: "assistant",
      role: "assistant",
      content: [{ type: "temp", text: "Thinking ..." }],
    };

    setTask((prev) => [...prev, prompt, tempPrompt]);

    try {
      const taskMessages = filterAssistantMsg([...task, prompt] as Message[]);

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
      });
      const responseContentType = response.headers.get("Content-Type") ?? "";

      if (response.ok && responseContentType.includes("text/event-stream")) {
        await consumeStreamingResponse(response);
        return;
      }

      const responseData = (await response
        .json()
        .catch(() => null)) as ChatApiResponse | null;

      if (responseData?.stopReason && responseData?.endAction) {
        handleConversationStop(responseData);
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
        setDbTaskId(taskId);
      }

      if (error) {
        showAlert("Error", error);
        return;
      }
    } catch {
      showAlert("Error", "Unable to send your message right now.");
    }

    setIsLoading(false);
  };

  const showAlert = (title: string, text: string) => {
    nextAlertId.current += 1;
    setAlert({ id: nextAlertId.current, title, text });
    setIsLoading(false);
    setTask((prev) => prev.slice(0, -1));
  };

  return (
    <main className="ChatWrapper relative z-0 flex h-full flex-1 flex-col overflow-hidden">
      {alert && <AlertMessage message={alert} />}

      <ChatHeader
        personaLabel={selectedPersona.label}
        messageCount={task.length}
        conversationStatus={taskStatus}
      />

      <section className="mt-14 flex w-full flex-col gap-3 px-3 pt-2 lg:px-5">
        <ChatPersonaPicker
          selectedPersonaId={selectedPersona.id}
          onSelectPersona={handleSelectPersona}
        />
      </section>

      <section
        id="ChatWrapperContent"
        className={classNames(
          "droplet-scrollbar relative z-10 flex w-full flex-1 flex-col overflow-y-auto pb-4",
          isNewTask && "items-center justify-center px-4",
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
            endState={endState}
          />
        )}
      </section>

      <ChatInput
        sendMessage={sendMessage}
        loading={isLoading}
        disabled={isConversationEnded}
        startPrompt={startMsg}
        personaLabel={selectedPersona.label}
      />
    </main>
  );
}
