import { PERSONAS } from "@/constants/assistant-personas";
import PageHead from "@/components/layout/page-head";
import PersonaCard from "@/components/shared/persona-card";
import classNames from "classnames";

interface PersonasSectionProps {
  isAppMode?: boolean;
  maxWidthClass?: string;
}

export default function PersonasSection({
  isAppMode = false,
  maxWidthClass = "max-w-6xl",
}: PersonasSectionProps) {
  const sectionClassName = classNames(
    "PersonasSection mx-auto flex w-full flex-col gap-6 p-4",
    maxWidthClass,
  );

  return (
    <section className={sectionClassName}>
      <PageHead
        title={isAppMode ? "AI Personas" : "Choose Your AI Persona"}
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PERSONAS.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            href={isAppMode ? `/app?persona=${persona.id}` : `/sign-up`}
          />
        ))}
      </div>
    </section>
  );
}
