import { PERSONAS } from "@/constants/assistant-personas";
import PageHead from "@/components/layout/page-head";
import PersonaCard from "@/components/shared/persona-card";

interface PersonasSectionProps {
  isAppMode?: boolean;
}

export default function PersonasSection({
  isAppMode = false,
}: PersonasSectionProps) {
  return (
    <section className="PersonasSection mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <PageHead
        title={isAppMode ? "AI Personas" : "Choose Your AI Persona"}
        subtitle="Explore the Cellesseon persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
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
