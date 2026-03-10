import {
  DEFAULT_PERSONA_ID,
  PERSONAS,
  getPersona,
} from "@/constants/assistant-personas";
import { PersonaId } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";

export interface Entitlements {
  planName: PlanName;
  allowedPersonaIds: PersonaId[];
  supportsImageGeneration: boolean;
  supportsAudioGeneration: boolean;
  imageLimitReached: boolean;
  audioLimitReached: boolean;
}

export function resolveEntitlements(planName?: PlanName | null): Entitlements {
  const normalizedPlan: PlanName = planName ?? "Lite";
  const allowedPersonaIds = PERSONAS.map((persona) => persona.id);

  if (normalizedPlan === "Premium") {
    return {
      planName: normalizedPlan,
      allowedPersonaIds,
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
    };
  }

  if (normalizedPlan === "Pro") {
    return {
      planName: normalizedPlan,
      allowedPersonaIds,
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
    };
  }

  return {
    planName: "Lite",
    allowedPersonaIds,
    supportsImageGeneration: true,
    supportsAudioGeneration: true,
    imageLimitReached: false,
    audioLimitReached: false,
  };
}

export function resolvePersonaForPlan({
  personaId,
  planName,
}: {
  personaId?: string | null;
  planName?: PlanName | null;
}) {
  const entitlements = resolveEntitlements(planName);
  const selectedPersona = getPersona(personaId);

  if (entitlements.allowedPersonaIds.includes(selectedPersona.id)) {
    return selectedPersona;
  }

  const fallbackPersonaId =
    entitlements.allowedPersonaIds[0] ?? DEFAULT_PERSONA_ID;
  return getPersona(fallbackPersonaId);
}
