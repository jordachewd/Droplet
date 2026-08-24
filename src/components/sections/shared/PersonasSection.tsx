import PublicSection from "@/components/public/PublicSection";
import PersonaCard from "@/components/shared/PersonaCard";
import { PromoContent } from "@/constants/promo-content";
import { Persona, PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";

interface PersonasSectionProps {
  personas: Persona[];
  isAppMode?: boolean;
  allowedPersonaIds?: PersonaId[];
  showLockedPersonas?: boolean;
  personaAccess?: Partial<Record<PersonaId, PersonaAccessLevel>>;
  personaRequiredPlan?: Partial<Record<PersonaId, "Pro" | "Premium" | null>>;
  promoContent?: PromoContent;
}

export default function PersonasSection({
  personas,
  isAppMode = false,
  allowedPersonaIds,
  showLockedPersonas = true,
  personaAccess,
  personaRequiredPlan,
  promoContent,
}: PersonasSectionProps) {
  const allowedPersonaIdSet = new Set(allowedPersonaIds ?? []);
  const enforcePlanFilter = isAppMode && allowedPersonaIds !== undefined;

  return (
    <PublicSection
      id="personas-section"
      sectionClass="personas-section"
      wrapperClass="personas-wrapper"
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
            promoContent={promoContent}
          />
        );
      })}
    </PublicSection>
  );
}
