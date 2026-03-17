import { PERSONAS } from "@/constants/assistant-personas";
import PageHead from "@/components/layout/page-head";
import PersonaCard from "@/components/shared/persona-card";
import { PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";
import classNames from "classnames";

interface PersonasSectionProps {
  isAppMode?: boolean;
  maxWidthClass?: string;
  allowedPersonaIds?: PersonaId[];
  showLockedPersonas?: boolean;
  personaAccess?: Partial<Record<PersonaId, PersonaAccessLevel>>;
  personaRequiredPlan?: Partial<Record<PersonaId, "Pro" | "Premium" | null>>;
}

export default function PersonasSection({
  isAppMode = false,
  maxWidthClass = "max-w-6xl",
  allowedPersonaIds,
  showLockedPersonas = true,
  personaAccess,
  personaRequiredPlan,
}: PersonasSectionProps) {
  const sectionClassName = classNames(
    "PersonasSection mx-auto flex w-full flex-col gap-6 p-4",
    maxWidthClass,
  );
  const allowedPersonaIdSet = new Set(allowedPersonaIds ?? []);
  const enforcePlanFilter = isAppMode && allowedPersonaIds !== undefined;

  return (
    <section className={sectionClassName}>
      <PageHead
        title={isAppMode ? "AI Personas" : "Choose Your AI Persona"}
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona) => {
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
