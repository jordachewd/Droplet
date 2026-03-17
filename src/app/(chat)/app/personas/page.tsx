import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import PageWrapper from "@/components/layout/page-wrapper";
import PersonasSection from "@/components/sections/personas-section";
import { PERSONAS } from "@/constants/assistant-personas";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getRequiredPlanForPersona,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";
import { PersonaId } from "@/types/PersonaData.d";

export default async function AppPersonasPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
  }

  const isAdmin = userData.role === "admin";
  const fullPersonaAccessByPlan = await getEffectivePersonaAccessByPlan();
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  const personaRequiredPlan: Partial<
    Record<PersonaId, "Pro" | "Premium" | null>
  > = {};
  for (const persona of PERSONAS) {
    personaRequiredPlan[persona.id] = getRequiredPlanForPersona(
      persona.id,
      fullPersonaAccessByPlan,
    );
  }

  return (
    <PageWrapper id="AppPersonasPage" scrollable>
      <PersonasSection
        isAppMode
        allowedPersonaIds={entitlements.allowedPersonaIds}
        showLockedPersonas
        personaAccess={entitlements.personaAccess}
        personaRequiredPlan={personaRequiredPlan}
      />
    </PageWrapper>
  );
}
