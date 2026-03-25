import PersonaCard from "@/components/shared/persona-card";
import { Persona, PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";
import classNames from "classnames";

interface PersonasSectionProps {
  personas: Persona[];
  isAppMode?: boolean;
  allowedPersonaIds?: PersonaId[];
  showLockedPersonas?: boolean;
  personaAccess?: Partial<Record<PersonaId, PersonaAccessLevel>>;
  personaRequiredPlan?: Partial<Record<PersonaId, "Pro" | "Premium" | null>>;
  className?: string;
}

export default function PersonasSection({
  personas,
  isAppMode = false,
  allowedPersonaIds,
  showLockedPersonas = true,
  personaAccess,
  personaRequiredPlan,
  className = "",
}: PersonasSectionProps) {
  const allowedPersonaIdSet = new Set(allowedPersonaIds ?? []);
  const enforcePlanFilter = isAppMode && allowedPersonaIds !== undefined;

  return (
    <section
      className={classNames(
        "PersonasSection grid grid-cols-1 sm:grid-cols-2",
        "lg:grid-cols-3 mx-auto w-full max-w-screen-2xl gap-10",
        className,
      )}
    >
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
    </section>
  );
}
