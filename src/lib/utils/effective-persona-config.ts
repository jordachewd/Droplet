import "server-only";

import {
  DEFAULT_PERSONA_ID,
  PERSONAS,
  VALID_PERSONA_ID_SET,
} from "@/constants/assistant-personas";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { isObjectRecord } from "@/lib/utils/type-guards";
import { Persona, PersonaId } from "@/types/PersonaData.d";

type PersonaOverrideValue = {
  label?: string;
  tagline?: string;
  description?: string;
  starterPrompts?: string[];
};

type PersonaOverrideMap = Partial<Record<PersonaId, PersonaOverrideValue>>;

type AppSettingRecord = {
  value?: unknown;
};

const DEFAULT_PERSONA_MAP: Record<PersonaId, Persona> = PERSONAS.reduce(
  (accumulator, persona) => {
    accumulator[persona.id] = persona;
    return accumulator;
  },
  {} as Record<PersonaId, Persona>,
);

function clonePersona(persona: Persona): Persona {
  return {
    ...persona,
    starterPrompts: [...persona.starterPrompts],
  };
}

function normalizeNonEmptyString({
  value,
  fallback,
}: {
  value: unknown;
  fallback: string;
}): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function normalizeStarterPrompts({
  value,
  fallback,
}: {
  value: unknown;
  fallback: string[];
}): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalizedPrompts = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalizedPrompts.length > 0 ? normalizedPrompts : fallback;
}

function normalizePersonaOverrides(value: unknown): PersonaOverrideMap {
  if (!isObjectRecord(value)) {
    return {};
  }

  const normalizedOverrides: PersonaOverrideMap = {};

  for (const [personaId, overrideValue] of Object.entries(value)) {
    if (!VALID_PERSONA_ID_SET.has(personaId as PersonaId)) {
      continue;
    }

    if (!isObjectRecord(overrideValue)) {
      continue;
    }

    const basePersona = DEFAULT_PERSONA_MAP[personaId as PersonaId];
    normalizedOverrides[personaId as PersonaId] = {
      label: normalizeNonEmptyString({
        value: overrideValue.label,
        fallback: basePersona.label,
      }),
      tagline: normalizeNonEmptyString({
        value: overrideValue.tagline,
        fallback: basePersona.tagline,
      }),
      description: normalizeNonEmptyString({
        value: overrideValue.description,
        fallback: basePersona.description,
      }),
      starterPrompts: normalizeStarterPrompts({
        value: overrideValue.starterPrompts,
        fallback: [...basePersona.starterPrompts],
      }),
    };
  }

  return normalizedOverrides;
}

function applyPersonaOverride({
  persona,
  overrides,
}: {
  persona: Persona;
  overrides: PersonaOverrideValue | undefined;
}): Persona {
  if (!overrides) {
    return clonePersona(persona);
  }

  return {
    ...persona,
    label: normalizeNonEmptyString({
      value: overrides.label,
      fallback: persona.label,
    }),
    tagline: normalizeNonEmptyString({
      value: overrides.tagline,
      fallback: persona.tagline,
    }),
    description: normalizeNonEmptyString({
      value: overrides.description,
      fallback: persona.description,
    }),
    starterPrompts: normalizeStarterPrompts({
      value: overrides.starterPrompts,
      fallback: [...persona.starterPrompts],
    }),
  };
}

export async function getEffectivePersonaConfig(): Promise<Persona[]> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({ key: "admin.personaOverrides" })
      .select("value")
      .lean()) as AppSettingRecord | null;
    const personaOverrides = normalizePersonaOverrides(setting?.value);

    return PERSONAS.map((persona) =>
      applyPersonaOverride({
        persona,
        overrides: personaOverrides[persona.id],
      }),
    );
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return PERSONAS.map((persona) => clonePersona(persona));
  }
}

export function getPersonaFromConfig({
  personas,
  personaId,
}: {
  personas: Persona[];
  personaId?: string | null;
}): Persona {
  const personaMap = personas.reduce(
    (accumulator, persona) => {
      accumulator[persona.id] = persona;
      return accumulator;
    },
    {} as Record<PersonaId, Persona>,
  );

  if (!personaId) {
    return personaMap[DEFAULT_PERSONA_ID] ?? PERSONAS[0];
  }

  const resolvedPersonaId = personaId as PersonaId;
  return (
    personaMap[resolvedPersonaId] ??
    personaMap[DEFAULT_PERSONA_ID] ??
    PERSONAS[0]
  );
}
