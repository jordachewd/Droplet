import PageHead from "@/components/layout/page-head";
import PageWrapper from "@/components/layout/page-wrapper";
import PersonasSection from "@/components/sections/shared/personas-section";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";

export default async function PersonasPage() {
  const personas = await getEffectivePersonaConfig();

  return (
    <PageWrapper id="PersonasPageWrapper">
      <PageHead
        title="Choose Your AI Persona"
        subtitle="Explore the Droplet persona catalog. Each persona shapes the assistant's tone, guidance, and tool availability."
        align="center"
      />
      <PersonasSection personas={personas} />
    </PageWrapper>
  );
}
