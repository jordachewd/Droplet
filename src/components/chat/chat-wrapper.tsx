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
import ChatRolePicker from "@/components/chat/chat-role-picker";
import { getAssistantRole } from "@/constants/assistant-roles";
import { AssistantRoleId } from "@/types/AssistantRoleData.d";

interface ChatWrapperProps {
  initialRoleId?: string;
  initialTaskId?: string | null;
  initialMessages?: Message[];
}

export default function ChatWrapper({
  initialRoleId,
  initialTaskId = null,
  initialMessages = [],
}: ChatWrapperProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertParams | null>(null);
  const [startMsg, setStartMsg] = useState<string>("");
  const [dbTaskId, setDbTaskId] = useState<string | null>(initialTaskId);
  const [task, setTask] = useState<Message[]>(initialMessages);
  const [selectedRoleId, setSelectedRoleId] = useState<AssistantRoleId>(
    getAssistantRole(initialRoleId).id,
  );
  const nextAlertId = useRef<number>(0);
  const isNewTask = task.length === 0;

  const selectedRole = useMemo(
    () => getAssistantRole(selectedRoleId),
    [selectedRoleId],
  );

  useEffect(() => {
    setSelectedRoleId(getAssistantRole(initialRoleId).id);
  }, [initialRoleId]);

  function handleSelectRole(roleId: AssistantRoleId) {
    if (roleId === selectedRoleId) {
      return;
    }

    setSelectedRoleId(roleId);
    setTask([]);
    setDbTaskId(null);
    setStartMsg("");
  }

  function handleResetConversation() {
    setTask([]);
    setDbTaskId(null);
    setStartMsg("");
    setAlert(null);
  }

  const sendMessage = async (prompt: Message) => {
    if (!prompt) return;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: taskMessages,
          taskId: dbTaskId,
          assistantRoleId: selectedRole.id,
        }),
      });
      const responseData = (await response.json().catch(() => null)) as {
        taskData?: Message;
        taskId?: string;
        error?: string;
      } | null;

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

      if (taskData) {
        setTask((prev) => [...prev.slice(0, -1), taskData]);
      }

      if (taskId) {
        setDbTaskId(taskId);
      }

      if (error) {
        showAlert("Error", error);
        return;
      }
    } catch (error) {
      console.error(error);
      setTask((prev) => prev.slice(0, -1));
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
        setNewTask={handleResetConversation}
        isInUse={isLoading}
        assistantRoleLabel={selectedRole.label}
        messageCount={task.length}
      />

      <section className="mt-14 flex w-full flex-col gap-3 px-3 pt-2 lg:px-5">
        <ChatRolePicker
          selectedRoleId={selectedRole.id}
          onSelectRole={handleSelectRole}
        />
      </section>

      <section
        id="ChatWrapperContent"
        className={classNames(
          "cellesseon-scrollbar relative z-10 flex w-full flex-1 flex-col overflow-y-auto pb-4",
          isNewTask && "items-center justify-center px-4",
        )}
      >
        {isNewTask ? (
          <ChatIntro
            role={selectedRole}
            sendPrompt={(prompt) => setStartMsg(prompt)}
          />
        ) : (
          <ChatBody messages={task} assistantRoleLabel={selectedRole.label} />
        )}
      </section>

      <ChatInput
        sendMessage={sendMessage}
        loading={isLoading}
        startPrompt={startMsg}
        assistantRoleLabel={selectedRole.label}
      />
    </main>
  );
}
