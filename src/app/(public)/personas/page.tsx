import PageHead from "@/components/layout/page-head";

import PersonasSection from "@/components/sections/shared/personas-section";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";

export default async function PersonasPage() {
  const personas = await getEffectivePersonaConfig();

  return (
    <>
      <PageHead
        title="Choose Your AI Persona"
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
        align="center"
      />
      <PersonasSection personas={personas} />
    </>
  );
}
