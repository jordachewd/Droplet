import ChatHeader from "@/components/chat/chat-header";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { ReactNode } from "react";

interface RouteGroupLayoutProps {
  children: ReactNode;
}

export default async function RouteGroupLayout({
  children,
}: RouteGroupLayoutProps) {
  const personas = await getEffectivePersonaConfig();

  return (
    <>
      <ChatHeader personas={personas} />
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
