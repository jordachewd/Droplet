import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
import ChatAccountLoadErrorState from "@/components/shared/ChatAccountLoadErrorState";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";
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

  const userData = await ensureUserSynced(userId);
  if (!userData) {
    return (
      <ChatAccountLoadErrorState
        retryHref={`/app/c/${conversationId}`}
        containerClassName="ConversationPage"
      />
    );
  }

  const task = await getTaskByIdForUser({
    taskId: conversationId,
    userId,
  });

  if (!task) {
    notFound();
  }

  const isAdmin = userData.role === "admin";
  const [
    fullPersonaAccessByPlan,
    personas,
    supportEmail,
    stopReasonMessages,
    promoContent,
  ] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
    getEffectiveSupportEmail(),
    getEffectiveStopReasonMessages(),
    getEffectivePromoContent(),
  ]);
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  return (
    <ChatWrapper
      personas={personas}
      supportEmail={supportEmail}
      stopReasonMessages={stopReasonMessages}
      promoContent={promoContent}
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
