import ChatHeader from "@/components/chat/chat-header";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import { ReactNode } from "react";

interface RouteGroupLayoutProps {
  children: ReactNode;
}

export default function RouteGroupLayout({ children }: RouteGroupLayoutProps) {
  return (
    <>
      <ChatHeader />
      <ChatPageWrapper
        id="PageWrapperContent"
        scrollable
        className="RouteGroupLayout"
      >
        {children}
      </ChatPageWrapper>
    </>
  );
}
