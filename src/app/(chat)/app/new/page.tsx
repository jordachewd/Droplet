import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import PageHead from "@/components/layout/page-head";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import PersonaCard from "@/components/shared/persona-card";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getRequiredPlanForPersona,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";

export default async function NewConversationPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
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
  const allowedPersonaIdSet = new Set(entitlements.allowedPersonaIds);

  return (
    <ChatPageWrapper id="NewConversationPage" scrollable>
      <section className="NewConversationPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Start a New Conversation"
          subtitle="Pick an AI persona and jump directly into the chat dashboard."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => {
            const isLocked = !allowedPersonaIdSet.has(persona.id);
            const isTrialPersona =
              entitlements.personaAccess?.[persona.id] === "limited";
            const requiredPlan = getRequiredPlanForPersona(
              persona.id,
              fullPersonaAccessByPlan,
            );

            return (
              <PersonaCard
                key={persona.id}
                persona={persona}
                href={isLocked ? "/app/plans" : `/app?persona=${persona.id}`}
                compact
                locked={isLocked}
                trial={isTrialPersona}
                requiredPlan={requiredPlan}
              />
            );
          })}
        </div>
      </section>
    </ChatPageWrapper>
  );
}
