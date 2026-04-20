"use client";

import { useState, useMemo } from "react";
import classNames from "classnames";
import Image from "next/image";
import type { Persona, PersonaId } from "@/types/PersonaData.d";

interface HandoffDialogProps {
  personas: Persona[];
  currentPersonaId: PersonaId;
  onSelect: (personaId: PersonaId) => void;
  onClose: () => void;
}

export default function HandoffDialog({
  personas,
  currentPersonaId,
  onSelect,
  onClose,
}: HandoffDialogProps) {
  const [selectedId, setSelectedId] = useState<PersonaId | null>(null);

  const availablePersonas = useMemo(
    () => personas.filter((p) => p.id !== currentPersonaId),
    [personas, currentPersonaId],
  );

  return (
    <div
      className="HandoffDialog fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hand off conversation to another persona"
    >
      <div className="mx-4 flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-white p-6 shadow-2xl dark:bg-nightIndigo-950">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold">Continue with another persona</h3>
          <p className="text-sm opacity-60">
            A summary of this conversation will start the new one.
          </p>
        </div>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {availablePersonas.map((persona) => {
            const isSelected = selectedId === persona.id;
            const cardClass = classNames(
              "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200",
              isSelected
                ? "border-limeAccent-500 bg-limeAccent-500/10"
                : "border-transparent bg-lavenderHaze-100/50 hover:border-lavenderHaze-300 dark:bg-nightIndigo-900/50 dark:hover:border-nightIndigo-600",
            );

            return (
              <button
                key={persona.id}
                type="button"
                className={cardClass}
                onClick={() => setSelectedId(persona.id)}
                aria-pressed={isSelected}
              >
                {persona.heroImage && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={persona.heroImage}
                      alt={persona.label}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                )}
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-bold">{persona.label}</span>
                  <span className="text-xxs opacity-50">{persona.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm opacity-60 transition-opacity hover:opacity-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedId && onSelect(selectedId)}
            disabled={!selectedId}
            className={classNames(
              "btn btn-contained rounded-full px-6 py-2 text-sm font-semibold",
              !selectedId && "cursor-not-allowed opacity-40",
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
