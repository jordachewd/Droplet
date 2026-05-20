import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { HomepageCopy } from "@/constants/homepage-copy";
import { PersonaId } from "@/types/PersonaData.d";
import PublicSection from "@/components/public/PublicSection";
import ContentCard from "@/components/layout/ContentCard";
import PageHead from "@/components/layout/PageHead";

interface PersonaSpotlightProps {
  id: string;
  copy: Pick<
    HomepageCopy,
    "spotlightLabel" | "spotlightHeading" | "spotlightDescription"
  >;
  featuredPersonaIds: PersonaId[];
}

export default async function PersonaSpotlight({
  id,
  copy,
  featuredPersonaIds,
}: PersonaSpotlightProps) {
  const suffix = "persona-spotlight";
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
      sectionClass={`${suffix}-section`}
      wrapperClass={`${suffix}-wrapper`}
    >
      <PageHead
        id={`${suffix}-head`}
        eyebrow={copy.spotlightLabel}
        title={copy.spotlightHeading}
        subtitle={copy.spotlightDescription}
        align="center"
        headingLevel="h2"
        type="section"
      />

      <div id={`${suffix}-grid`} className="grid gap-4 lg:grid-cols-3">
        {featuredPersonas.map((persona) => (
          <ContentCard
            key={persona.id}
            eyebrow={persona.category}
            title={persona.label}
            icon={persona.icon}
            description={persona.description}
          >
            <p className="body-2 mt-4 rounded-xl p-2 text-sm bg-lavenderHaze-100 dark:bg-nightIndigo-1000/70">
              &ldquo;{persona.starterPrompts[0]}&rdquo;
            </p>
          </ContentCard>
        ))}
      </div>
    </PublicSection>
  );
}
