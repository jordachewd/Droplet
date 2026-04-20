import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatHeader from "@/components/chat/chat-header";
import AppLayoutShell from "@/components/shared/app-layout-shell";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

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
    const userData = await ensureUserSynced(userId);
    if (
      userData &&
      !userData.onboardingCompleted &&
      userData.role !== "admin"
    ) {
      const headerList = await headers();
      const pathname = headerList.get("x-next-pathname") ?? "";
      const isExempt = ONBOARDING_EXEMPT_PATHS.has(pathname);
      if (!isExempt && !pathname.startsWith("/app/onboarding")) {
        redirect("/app/onboarding");
      }
    }
  }

  return (
    <AppLayoutShell
      className="ChatLayout"
      mainId="chat-layout"
      sidebar={<ChatSidebar />}
      header={<ChatHeader />}
    >
      {children}
    </AppLayoutShell>
  );
}
