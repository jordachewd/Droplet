import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatSidebarLoading from "@/components/chat/sidebar/chat-sidebar-loading";
import ChatHeader from "@/components/chat/chat-header";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import { ReactNode, Suspense } from "react";

interface ChatRouteLayoutProps {
  children: ReactNode;
}

export default async function ChatRouteLayout({
  children,
}: ChatRouteLayoutProps) {
  return (
    <ChatPageWrapper className="ChatRouteLayout flex-row!">
      <a href="#chat-main-content" className="skip-link">
        Skip to main content
      </a>

      <Suspense fallback={<ChatSidebarLoading />}>
        <ChatSidebar />
      </Suspense>

      <main
        id="chat-main-content"
        className="ChatRouteLayoutMain relative flex flex-col h-full min-w-0 flex-1"
      >
        <ChatHeader />
        {children}
      </main>
    </ChatPageWrapper>
  );
}
