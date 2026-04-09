import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatSidebarLoading from "@/components/chat/sidebar/chat-sidebar-loading";
import ChatHeader from "@/components/chat/chat-header";
import AppLayoutShell from "@/components/shared/app-layout-shell";
import { ReactNode, Suspense } from "react";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatRouteLayout({ children }: ChatLayoutProps) {
  return (
    <AppLayoutShell
      className="ChatRouteLayout"
      mainId="chat-main-content"
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
