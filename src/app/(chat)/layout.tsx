import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatHeader from "@/components/chat/chat-header";
import PageWrapper from "@/components/layout/page-wrapper";
import { auth } from "@clerk/nextjs/server";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
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
  const fullPersonaAccessByPlan = await getEffectivePersonaAccessByPlan();
  const entitlements = resolveEntitlements(userData?.plan?.name ?? "Lite", {
    fullPersonaAccessByPlan,
  });

  return (
    <PageWrapper
      id="ChatRouteLayoutWrapper"
      className="ChatRouteLayout flex-row!"
    >
      <ChatSidebar />

      <section className="ChatRouteLayoutMain relative flex h-full min-w-0 flex-1">
        <ChatHeader allowedPersonaIds={entitlements.allowedPersonaIds} />
        {children}
      </section>
    </PageWrapper>
  );
}
