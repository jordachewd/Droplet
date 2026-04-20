import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import OnboardingWizard from "@/components/chat/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    redirect("/sign-in");
  }

  if (userData.onboardingCompleted) {
    redirect("/app");
  }

  const isAdmin = userData.role === "admin";
  const [fullPersonaAccessByPlan, personas] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
  ]);
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  return (
    <ChatPageWrapper id="OnboardingPage" scrollable>
      <OnboardingWizard
        personas={personas}
        allowedPersonaIds={entitlements.allowedPersonaIds}
        trialPersonaIds={entitlements.trialPersonaIds}
      />
    </ChatPageWrapper>
  );
}
