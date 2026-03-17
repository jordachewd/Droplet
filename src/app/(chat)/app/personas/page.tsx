import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import PageWrapper from "@/components/layout/page-wrapper";
import PersonasSection from "@/components/sections/personas-section";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";

export default async function AppPersonasPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
  }

  const fullPersonaAccessByPlan = await getEffectivePersonaAccessByPlan();
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    fullPersonaAccessByPlan,
  });

  return (
    <PageWrapper id="AppPersonasPage" scrollable>
      <PersonasSection
        isAppMode
        allowedPersonaIds={entitlements.allowedPersonaIds}
        showLockedPersonas
      />
    </PageWrapper>
  );
}
