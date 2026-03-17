import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PERSONAS } from "@/constants/assistant-personas";
import PageHead from "@/components/layout/page-head";
import PageWrapper from "@/components/layout/page-wrapper";
import PersonaCard from "@/components/shared/persona-card";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { resolveEntitlements } from "@/lib/utils/resolve-entitlements";

export default async function NewConversationPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;

  if (!userData) {
    notFound();
  }

  const fullPersonaAccessByPlan = await getEffectivePersonaAccessByPlan();
  const entitlements = resolveEntitlements(userData.plan?.name ?? "Lite", {
    fullPersonaAccessByPlan,
  });
  const allowedPersonaIdSet = new Set(entitlements.allowedPersonaIds);

  return (
    <PageWrapper id="NewConversationPage" scrollable>
      <section className="NewConversationPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Start a New Conversation"
          subtitle="Pick an AI persona and jump directly into the chat dashboard."
        />

        <div className="grid grid-cols-2 gap-4">
          {PERSONAS.map((persona) => {
            const isLocked = !allowedPersonaIdSet.has(persona.id);
            const isTrialPersona =
              entitlements.personaAccess?.[persona.id] === "limited";

            return (
              <PersonaCard
                key={persona.id}
                persona={persona}
                href={isLocked ? "/app/plans" : `/app?persona=${persona.id}`}
                compact
                locked={isLocked}
                trial={isTrialPersona}
              />
            );
          })}
        </div>
      </section>
    </PageWrapper>
  );
}
