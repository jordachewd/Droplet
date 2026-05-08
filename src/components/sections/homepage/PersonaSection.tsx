import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { HomepageCopy } from "@/constants/homepage-copy";
import { PersonaId } from "@/types/PersonaData.d";
import PublicSection from "@/components/public/PublicSection";

interface PersonaSpotlightProps {
  id: string;
  copy: Pick<
    HomepageCopy,
    "spotlightLabel" | "spotlightHeading" | "spotlightDescription"
  >;
  featuredPersonaIds: PersonaId[];
}

export default async function PersonaSection({
  id,
  copy,
  featuredPersonaIds,
}: PersonaSpotlightProps) {
  const effectivePersonas = await getEffectivePersonaConfig();

  const effectivePersonasById = new Map(
    effectivePersonas.map((persona) => [persona.id, persona] as const),
  );

  const featuredPersonas = featuredPersonaIds
    .map((personaId) => effectivePersonasById.get(personaId))
    .filter(
      (persona): persona is (typeof effectivePersonas)[number] =>
        persona !== undefined,
    );

  return (
    <PublicSection
      id={id}
      sectionClass="persona-section"
      wrapperClass="persona-wrapper"
    >
      <div className="flex flex-col gap-3 text-center">
        <p className="eyebrow">{copy.spotlightLabel}</p>
        <h2 className="heading-4 leading-tight">{copy.spotlightHeading}</h2>
        <p className="body-2 mx-auto max-w-3xl text-sm md:text-base">
          {copy.spotlightDescription}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {featuredPersonas.map((persona) => (
          <article key={persona.id} className="content-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">{persona.category}</p>
                <h3 className="heading-5 mt-2">{persona.label}</h3>
              </div>
              <span className="featured-icon">
                <i className={persona.icon} aria-hidden="true"></i>
              </span>
            </div>
            <p className="body-2 mt-4 text-sm md:text-base">
              {persona.description}
            </p>
            <p className="body-2 mt-4 rounded-xl px-2 py-2.5 text-sm bg-lavenderHaze-100 dark:bg-nightIndigo-1000/70">
              &ldquo;{persona.starterPrompts[0]}&rdquo;
            </p>
          </article>
        ))}
      </div>
    </PublicSection>
  );
}
