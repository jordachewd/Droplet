import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";
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
  const [fullPersonaAccessByPlan, personas, supportEmail, stopReasonMessages] =
    await Promise.all([
      getEffectivePersonaAccessByPlan(),
      getEffectivePersonaConfig(),
      getEffectiveSupportEmail(),
      getEffectiveStopReasonMessages(),
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
      initialPersonaId={persona}
      allowedPersonaIds={entitlements.allowedPersonaIds}
    />
  );
}
