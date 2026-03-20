import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatHeader from "@/components/chat/chat-header";
import PageWrapper from "@/components/layout/page-wrapper";
import { auth } from "@clerk/nextjs/server";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";

interface ChatRouteLayoutProps {
  children: React.ReactNode;
}

export default async function ChatRouteLayout({
  children,
}: ChatRouteLayoutProps) {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  const isAdmin = userData?.role === "admin";
  const [fullPersonaAccessByPlan, personas] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
  ]);
  const entitlements = resolveEntitlements(userData?.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  return (
    <PageWrapper
      id="ChatRouteLayoutWrapper"
      className="ChatRouteLayout flex-row!"
    >
      <a href="#chat-main-content" className="skip-link">
        Skip to main content
      </a>
      <ChatSidebar />

      <main
        id="chat-main-content"
        className="ChatRouteLayoutMain relative flex h-full min-w-0 flex-1"
      >
        <ChatHeader
          personas={personas}
          allowedPersonaIds={entitlements.allowedPersonaIds}
        />
        {children}
      </main>
    </PageWrapper>
  );
}
