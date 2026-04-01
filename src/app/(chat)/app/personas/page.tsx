import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import PersonasSection from "@/components/sections/shared/personas-section";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getRequiredPlanForPersona,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";
import { PersonaId } from "@/types/PersonaData.d";
import PageHead from "@/components/layout/page-head";

export default async function AppPersonasPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
  }

  const isAdmin = userData.role === "admin";
  const [fullPersonaAccessByPlan, personas, promoContent] = await Promise.all([
    getEffectivePersonaAccessByPlan(),
    getEffectivePersonaConfig(),
    getEffectivePromoContent(),
  ]);
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    isAdmin,
    fullPersonaAccessByPlan,
  });

  const personaRequiredPlan: Partial<
    Record<PersonaId, "Pro" | "Premium" | null>
  > = {};
  for (const persona of personas) {
    personaRequiredPlan[persona.id] = getRequiredPlanForPersona(
      persona.id,
      fullPersonaAccessByPlan,
    );
  }

  return (
    <ChatPageWrapper id="ChatPersonasPage" scrollable>
      <PageHead
        title="AI Personas"
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
        align="center"
        className="px-4 mt-12"
      />

      <PersonasSection
        personas={personas}
        isAppMode
        allowedPersonaIds={entitlements.allowedPersonaIds}
        showLockedPersonas
        personaAccess={entitlements.personaAccess}
        personaRequiredPlan={personaRequiredPlan}
        className="px-4 max-w-7xl! gap-6!"
        promoContent={promoContent}
      />
    </ChatPageWrapper>
  );
}
