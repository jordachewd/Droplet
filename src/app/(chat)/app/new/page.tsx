import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatAccountLoadErrorState from "@/components/shared/ChatAccountLoadErrorState";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

export default async function NewConversationPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const userData = await ensureUserSynced(userId);

  if (!userData) {
    return (
      <ChatAccountLoadErrorState
        retryHref="/app/new"
        containerClassName="NewConversationPage"
      />
    );
  }

  const defaultPersonaId = userData.preferences?.defaultPersonaId;
  const targetUrl = defaultPersonaId
    ? `/app?persona=${defaultPersonaId}`
    : "/app";

  redirect(targetUrl);
}
