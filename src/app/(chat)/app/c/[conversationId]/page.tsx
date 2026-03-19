import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";

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

  const userData = await ensureUserSynced(userId);
  if (!userData) {
    notFound();
  }

  const isAdmin = userData.role === "admin";
  const [fullPersonaAccessByPlan, personas] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
  ]);
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  return (
    <ChatWrapper
      personas={personas}
      initialMessages={task.messages}
      initialTaskId={task._id}
      initialPersonaId={task.personaId}
      allowedPersonaIds={entitlements.allowedPersonaIds}
      initialTaskStatus={task.status}
      initialEndedReason={task.endedReason}
      initialEndAction={task.endAction}
    />
  );
}
