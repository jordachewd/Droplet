import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import classNames from "classnames";

export default async function PersonaSpotlight() {
  const effectivePersonas = await getEffectivePersonaConfig();
  const featuredPersonas = effectivePersonas.filter((persona) =>
    ["strategist", "teacher", "creator"].includes(persona.id),
  );
  return (
    <section className="PersonaSpotlight mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xxs font-semibold uppercase tracking-[0.3em] text-midnightBlue-700 dark:text-lavenderHaze-700">
          Persona spotlight
        </p>
        <h2 className="heading-4 leading-tight">
          Different jobs need different voices.
        </h2>
        <p className="body-2 mx-auto max-w-3xl text-sm md:text-base">
          Droplet starts with purpose-built personas so planning, teaching, and
          creative work do not feel like the same assistant wearing a different
          label.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {featuredPersonas.map((persona) => (
          <article
            key={persona.id}
            className={classNames(
              "rounded-2xl px-6 py-7 shadow-sm bg-lavenderHaze-100/78 dark:bg-nightIndigo-900/82",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-midnightBlue-700 dark:text-lavenderHaze-700">
                  {persona.category}
                </p>
                <h3 className="heading-5 mt-2">{persona.label}</h3>
              </div>
              <span className="rounded-full bg-lavenderHaze-100 px-3 py-2 text-lg dark:bg-nightIndigo-900/50">
                <i className={persona.icon} aria-hidden="true"></i>
              </span>
            </div>
            <p className="body-2 mt-4 text-sm md:text-base">
              {persona.description}
            </p>
            <p className="body-2 mt-4 rounded-2xl bg-lavenderHaze-200/80 px-4 py-3 text-sm dark:bg-nightIndigo-1000/70">
              &ldquo;{persona.starterPrompts[0]}&rdquo;
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
