import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatWrapper from "@/components/chat/chat-wrapper";
import PageWrapper from "@/components/layout/page-wrapper";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } = await params;
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const task = await getTaskByIdForUser({
    taskId: conversationId,
    userId,
  });

  if (!task) {
    notFound();
  }

  return (
    <PageWrapper id="ConversationPageWrapper" className="flex-row!">
      <ChatSidebar />
      <ChatWrapper
        initialMessages={task.messages}
        initialTaskId={task._id}
        initialPersonaId={task.personaId}
      />
    </PageWrapper>
  );
}
