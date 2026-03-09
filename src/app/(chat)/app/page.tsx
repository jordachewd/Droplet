import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatWrapper from "@/components/chat/chat-wrapper";
import PageWrapper from "@/components/layout/page-wrapper";

interface ChatPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { role } = await searchParams;

  return (
    <PageWrapper id="ChatPageWrapper" className="flex-row!">
      <ChatSidebar />
      <ChatWrapper initialRoleId={role} />
    </PageWrapper>
  );
}
