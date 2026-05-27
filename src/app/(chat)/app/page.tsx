import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
import ChatAccountLoadErrorState from "@/components/shared/ChatAccountLoadErrorState";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { buildHandoffContext } from "@/lib/utils/build-handoff-context";

interface ChatPageProps {
  searchParams: Promise<{ persona?: string; handoff?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { userId } = await auth();
  const { persona, handoff } = await searchParams;

  if (!userId) {
    notFound();
  }

  const userData = await ensureUserSynced(userId);

  if (!userData) {
    return (
      <ChatAccountLoadErrorState
        retryHref="/app"
        containerClassName="ChatPage"
      />
    );
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

  let handoffContext: string | undefined;
  if (handoff) {
    const sourceTask = await getTaskByIdForUser({
      taskId: handoff,
      userId,
    });
    if (sourceTask) {
      const sourcePersona = personas.find((p) => p.id === sourceTask.personaId);
      handoffContext = buildHandoffContext({
        messages: sourceTask.messages,
        sourcePersonaLabel: sourcePersona?.label ?? sourceTask.personaId,
        sourceTitle: sourceTask.title,
      });
    }
  }

  return (
    <ChatWrapper
      personas={personas}
      supportEmail={supportEmail}
      stopReasonMessages={stopReasonMessages}
      promoContent={promoContent}
      initialPersonaId={persona ?? userData.preferences?.defaultPersonaId}
      allowedPersonaIds={entitlements.allowedPersonaIds}
      handoffContext={handoffContext}
    />
  );
}
