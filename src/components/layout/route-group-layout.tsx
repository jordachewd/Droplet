import ChatHeader from "@/components/chat/chat-header";
import PageWrapper from "@/components/layout/page-wrapper";

interface RouteGroupLayoutProps {
  children: React.ReactNode;
}

export default function RouteGroupLayout({ children }: RouteGroupLayoutProps) {
  return (
    <>
      <ChatHeader />
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
