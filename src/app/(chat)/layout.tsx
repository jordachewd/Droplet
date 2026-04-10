import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatHeader from "@/components/chat/chat-header";
import AppLayoutShell from "@/components/shared/app-layout-shell";
import { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
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
