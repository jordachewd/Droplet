import PersonasSection from "@/components/sections/shared/personas-section";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";

export default async function PersonasPage() {
  const personas = await getEffectivePersonaConfig();

  return <PersonasSection personas={personas} />;
}
