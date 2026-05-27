import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatAccountLoadErrorState from "@/components/shared/ChatAccountLoadErrorState";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import SettingsForm from "@/components/chat/settings/settings-form";

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const userData = await ensureUserSynced(userId);

  if (!userData) {
    return (
      <ChatAccountLoadErrorState
        retryHref="/app/settings"
        containerClassName="SettingsPage"
      />
    );
  }

  const prefs = userData.preferences;

  return (
    <ChatPageWrapper id="SettingsPage" scrollable>
      <SettingsForm
        preferences={{
          intent: prefs?.intent,
          challenge: prefs?.challenge,
          expectation: prefs?.expectation,
          communicationStyle: prefs?.communicationStyle,
        }}
      />
    </ChatPageWrapper>
  );
}
