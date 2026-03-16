"use client";

import classNames from "classnames";
import { PERSONAS } from "@/constants/assistant-personas";
import { PersonaId } from "@/types/PersonaData.d";

interface ChatPersonaPickerProps {
  selectedPersonaId: PersonaId;
  allowedPersonaIds: PersonaId[];
  onSelectPersona: (personaId: PersonaId) => void;
}

export default function ChatPersonaPicker({
  selectedPersonaId,
  allowedPersonaIds,
  onSelectPersona,
}: ChatPersonaPickerProps) {
  const allowedPersonaIdSet = new Set(allowedPersonaIds);

  return (
    <section className="ChatPersonaPicker flex w-full flex-col gap-2">
      <p className="px-1 text-xxs font-semibold uppercase tracking-wide opacity-70">
        Persona Studio
      </p>
      <div className="grid w-full grid-cols-2 gap-2">
        {PERSONAS.map((persona) => {
          const isActive = persona.id === selectedPersonaId;
          const isLocked = !allowedPersonaIdSet.has(persona.id);

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona.id)}
              disabled={isLocked}
              className={classNames(
                "inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                "border-lightBorders-500 bg-lightBackground-100 hover:bg-lightSecondary-200/90",
                "dark:border-darkBorders-500 dark:bg-jwdMarine-900 dark:hover:bg-darkSecondary-500/30",
                isActive &&
                  "border-jwdMarine-300 bg-lightPrimary-100 font-semibold dark:border-jwdAqua-500 dark:bg-darkPrimary-500/25",
                isLocked &&
                  "cursor-not-allowed opacity-70 hover:bg-lightBackground-100 dark:hover:bg-jwdMarine-900",
              )}
              aria-pressed={isActive}
              title={isLocked ? "Upgrade to unlock this persona." : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <i className={persona.icon}></i>
                {persona.label}
              </span>
              <span className="text-xxs uppercase tracking-wide opacity-70">
                {isLocked ? "Locked" : "Open"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
