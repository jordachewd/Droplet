import PersonasSection from "@/components/sections/personas-section";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";

export default async function PersonasPage() {
  const personas = await getEffectivePersonaConfig();

  return (
    <section className="PersonasPage mx-auto mt-14 flex w-full max-w-screen-2xl flex-1">
      <PersonasSection personas={personas} maxWidthClass="max-w-screen-2xl" />
    </section>
  );
}
