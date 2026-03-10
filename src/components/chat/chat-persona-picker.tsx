"use client";

import classNames from "classnames";
import { PERSONAS } from "@/constants/assistant-personas";
import { PersonaId } from "@/types/PersonaData.d";

interface ChatPersonaPickerProps {
  selectedPersonaId: PersonaId;
  onSelectPersona: (personaId: PersonaId) => void;
}

export default function ChatPersonaPicker({
  selectedPersonaId,
  onSelectPersona,
}: ChatPersonaPickerProps) {
  return (
    <section className="ChatPersonaPicker flex w-full flex-col gap-2">
      <p className="px-1 text-xxs font-semibold uppercase tracking-wide opacity-70">
        Persona Studio
      </p>
      <div className="droplet-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1">
        {PERSONAS.map((persona) => {
          const isActive = persona.id === selectedPersonaId;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona.id)}
              className={classNames(
                "inline-flex min-w-max items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all",
                "border-lightBorders-500 bg-lightBackground-100 hover:bg-lightSecondary-200/90",
                "dark:border-darkBorders-500 dark:bg-jwdMarine-900 dark:hover:bg-darkSecondary-500/30",
                isActive &&
                  "border-jwdMarine-300 bg-lightPrimary-100 font-semibold dark:border-jwdAqua-500 dark:bg-darkPrimary-500/25",
              )}
              aria-pressed={isActive}
            >
              <i className={persona.icon}></i>
              {persona.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
