import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
import { STOP_REASON_MESSAGES } from "@/constants/stop-reasons";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";

interface ChatPageProps {
  searchParams: Promise<{ persona?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { userId } = await auth();
  const { persona } = await searchParams;
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
  }

  const isAdmin = userData.role === "admin";
  const [fullPersonaAccessByPlan, personas, supportEmail] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
    getEffectiveSupportEmail(),
  ]);
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  return (
    <ChatWrapper
      personas={personas}
      supportEmail={supportEmail}
      stopReasonMessages={STOP_REASON_MESSAGES}
      initialPersonaId={persona}
      allowedPersonaIds={entitlements.allowedPersonaIds}
    />
  );
}
