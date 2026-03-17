"use client";

import classNames from "classnames";
import { PERSONAS } from "@/constants/assistant-personas";
import { PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";

interface ChatPersonaPickerProps {
  selectedPersonaId: PersonaId;
  allowedPersonaIds: PersonaId[];
  personaAccess?: Partial<Record<PersonaId, PersonaAccessLevel>>;
  personaRequiredPlan?: Partial<Record<PersonaId, PlanName | null>>;
  onSelectPersona: (personaId: PersonaId) => void;
}

export default function ChatPersonaPicker({
  selectedPersonaId,
  allowedPersonaIds,
  personaAccess,
  personaRequiredPlan,
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
          const accessLevel = personaAccess?.[persona.id]
            ? personaAccess[persona.id]
            : allowedPersonaIdSet.has(persona.id)
              ? "full"
              : "blocked";
          const isBlocked = accessLevel === "blocked";
          const isTrial = accessLevel === "limited";
          const planLabel = personaRequiredPlan?.[persona.id];
          const accessLabel = isBlocked
            ? (planLabel ?? "Locked")
            : isTrial
              ? (planLabel ?? "Trial")
              : "Open";
          const accessDescription = isBlocked
            ? `Upgrade${planLabel ? ` to ${planLabel}` : ""} to unlock this persona.`
            : isTrial
              ? `Limited access - 5 prompts per conversation.${planLabel ? ` Upgrade to ${planLabel} for` : " Upgrade to unlock"} full access.`
              : undefined;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona.id)}
              disabled={isBlocked}
              className={classNames(
                "inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                "border-slate-500 bg-lightBackground-100 hover:bg-lightBackground-200/90",
                "dark:border-slate-500 dark:bg-darkBackground-900 dark:hover:bg-darkBackground-500/30",
                isActive &&
                  "border-darkBackground-300 bg-lightBackground-100 font-semibold dark:border-darkBackground-500 dark:bg-darkBackground-500/25",
                isBlocked &&
                  "cursor-not-allowed opacity-70 hover:bg-lightBackground-100 dark:hover:bg-darkBackground-900",
              )}
              aria-pressed={isActive}
              title={accessDescription}
            >
              <span className="inline-flex items-center gap-2">
                <i className={persona.icon}></i>
                {persona.label}
              </span>
              <span className="text-xxs uppercase tracking-wide opacity-70">
                {accessLabel}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
