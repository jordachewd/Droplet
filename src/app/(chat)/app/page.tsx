import ChatWrapper from "@/components/chat/chat-wrapper";

interface ChatPageProps {
  searchParams: Promise<{ persona?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { persona } = await searchParams;

  return <ChatWrapper initialPersonaId={persona} />;
}
