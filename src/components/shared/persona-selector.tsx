"use client";

import classNames from "classnames";
import { useId } from "react";
import { Persona, PersonaId } from "@/types/PersonaData.d";

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersonaId: PersonaId;
  disabled?: boolean;
  onSelect: (personaId: PersonaId) => void;
  className?: string;
}

export default function PersonaSelector({
  personas,
  selectedPersonaId,
  disabled = false,
  onSelect,
  className,
}: PersonaSelectorProps) {
  const personaSelectId = useId();

  function handleSelectPersona(nextPersonaId: string) {
    if (!personas.some((persona) => persona.id === nextPersonaId)) {
      return;
    }

    onSelect(nextPersonaId as PersonaId);
  }

  return (
    <div
      className={classNames(
        "PersonaSelector flex items-center gap-2",
        className,
      )}
    >
      <label htmlFor={personaSelectId} className="sr-only">
        Select persona
      </label>
      <select
        id={personaSelectId}
        aria-label="Select persona"
        className="form-select-input py-2 pr-8 text-xs"
        value={selectedPersonaId}
        onChange={(event) => handleSelectPersona(event.target.value)}
        disabled={disabled}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.label}
          </option>
        ))}
      </select>
      <span className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
        Persona
      </span>
    </div>
  );
}
