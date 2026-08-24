import ChatHeader from "@/components/chat/chat-header";
import ChatSidebar from "@/components/chat/sidebar/ChatSidebar";
import ChatLayoutWrapper from "@/components/chat/ChatLayoutWrapper";
import ChatAccountLoadErrorState from "@/components/shared/ChatAccountLoadErrorState";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

const ONBOARDING_EXEMPT_PATHS = new Set([
  "/app/onboarding",
  "/app/profile",
  "/app/plans",
]);

interface ChatLayoutProps {
  children: ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  const { userId } = await auth();

  if (userId) {
    const headerList = await headers();
    const pathname = headerList.get("x-next-pathname") ?? "/app";
    const userData = await ensureUserSynced(userId);

    if (!userData) {
      return (
        <ChatAccountLoadErrorState
          retryHref={pathname}
          containerClassName="ChatLayout"
        />
      );
    }

    if (!userData.onboardingCompleted && userData.role !== "admin") {
      const isExempt = ONBOARDING_EXEMPT_PATHS.has(pathname);
      if (!isExempt && !pathname.startsWith("/app/onboarding")) {
        redirect("/app/onboarding");
      }
    }
  }

  return (
    <ChatLayoutWrapper
      mainId="chat-main"
      sidebar={<ChatSidebar />}
      header={<ChatHeader />}
    >
      {children}
    </ChatLayoutWrapper>
  );
}
