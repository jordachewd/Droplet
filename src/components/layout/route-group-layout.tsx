import ChatHeader from "@/components/chat/chat-header";
import PageWrapper from "@/components/layout/page-wrapper";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";

interface RouteGroupLayoutProps {
  children: React.ReactNode;
}

export default async function RouteGroupLayout({
  children,
}: RouteGroupLayoutProps) {
  const personas = await getEffectivePersonaConfig();

  return (
    <>
      <ChatHeader personas={personas} />
      <PageWrapper
        id="PageWrapperContent"
        scrollable
        className="RouteGroupLayout"
      >
        {children}
      </PageWrapper>
    </>
  );
}
