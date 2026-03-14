import ChatSidebar from "@/components/chat/chat-sidebar";
import PageWrapper from "@/components/layout/page-wrapper";

interface ChatRouteLayoutProps {
  children: React.ReactNode;
}

export default function ChatRouteLayout({ children }: ChatRouteLayoutProps) {
  return (
    <PageWrapper
      id="ChatRouteLayoutWrapper"
      className="ChatRouteLayout flex-row!"
    >
      <ChatSidebar />

      <section className="ChatRouteLayoutMain relative flex h-full min-w-0 flex-1">
        {children}
      </section>
    </PageWrapper>
  );
}
