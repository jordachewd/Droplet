import PageHead from "@/components/layout/page-head";
import PersonaCard from "@/components/shared/persona-card";
import { Persona, PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";

interface PersonasSectionProps {
  personas: Persona[];
  isAppMode?: boolean;
  allowedPersonaIds?: PersonaId[];
  showLockedPersonas?: boolean;
  personaAccess?: Partial<Record<PersonaId, PersonaAccessLevel>>;
  personaRequiredPlan?: Partial<Record<PersonaId, "Pro" | "Premium" | null>>;
}

export default function PersonasSection({
  personas,
  isAppMode = false,
  allowedPersonaIds,
  showLockedPersonas = true,
  personaAccess,
  personaRequiredPlan,
}: PersonasSectionProps) {
  const allowedPersonaIdSet = new Set(allowedPersonaIds ?? []);
  const enforcePlanFilter = isAppMode && allowedPersonaIds !== undefined;

  return (
    <section className="PersonasSection mx-auto flex w-full max-w-screen-2xl flex-col gap-10 px-4 py-16 pt-24">
      <PageHead
        title={isAppMode ? "AI Personas" : "Choose Your AI Persona"}
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => {
          const isLocked =
            enforcePlanFilter && !allowedPersonaIdSet.has(persona.id);

          if (isLocked && !showLockedPersonas) {
            return null;
          }

          const isTrialPersona = personaAccess?.[persona.id] === "limited";
          const requiredPlan = personaRequiredPlan?.[persona.id] ?? null;

          const href = isAppMode
            ? isLocked
              ? "/app/plans"
              : `/app?persona=${persona.id}`
            : "/sign-up";

          return (
            <PersonaCard
              key={persona.id}
              persona={persona}
              href={href}
              compact
              locked={isLocked}
              trial={isTrialPersona}
              requiredPlan={requiredPlan}
            />
          );
        })}
      </div>
    </section>
  );
}
