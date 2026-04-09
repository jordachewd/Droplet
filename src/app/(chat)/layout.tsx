import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatSidebarLoading from "@/components/chat/sidebar/chat-sidebar-loading";
import ChatHeader from "@/components/chat/chat-header";
import AppLayoutShell from "@/components/shared/app-layout-shell";
import { ReactNode, Suspense } from "react";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <AppLayoutShell
      className="ChatLayout"
      mainId="chat-layout"
      sidebar={
        <Suspense fallback={<ChatSidebarLoading />}>
          <ChatSidebar />
        </Suspense>
      }
      header={<ChatHeader />}
    >
      {children}
    </AppLayoutShell>
  );
}
