import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatWrapper from "@/components/chat/chat-wrapper";
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

  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite");

  return (
    <ChatWrapper
      initialPersonaId={persona}
      allowedPersonaIds={entitlements.allowedPersonaIds}
      personaAccess={entitlements.personaAccess}
    />
  );
}
