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
  supportsVideoGeneration: boolean;
  imageLimitReached: boolean;
  audioLimitReached: boolean;
  videoLimitReached: boolean;
}

interface ResolveEntitlementOptions {
  expiresOn?: Date | string | null;
  isSuspended?: boolean;
  now?: Date;
}

function isPaidPlanExpired({
  planName,
  expiresOn,
  now,
}: {
  planName: PlanName;
  expiresOn?: Date | string | null;
  now: Date;
}): boolean {
  if (planName === "Lite" || !expiresOn) {
    return false;
  }

  const expiryDate = new Date(expiresOn);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }

  return expiryDate < now;
}

export function resolveEntitlements(
  planName?: PlanName | null,
  options: ResolveEntitlementOptions = {},
): Entitlements {
  const normalizedPlan: PlanName = planName ?? "Lite";
  const now = options.now ?? new Date();
  const allowedPersonaIds = PERSONAS.map((persona) => persona.id);

  if (options.isSuspended) {
    return {
      planName: normalizedPlan,
      allowedPersonaIds: [],
      supportsImageGeneration: false,
      supportsAudioGeneration: false,
      supportsVideoGeneration: false,
      imageLimitReached: true,
      audioLimitReached: true,
      videoLimitReached: true,
    };
  }

  if (
    isPaidPlanExpired({
      planName: normalizedPlan,
      expiresOn: options.expiresOn,
      now,
    })
  ) {
    return {
      planName: "Lite",
      allowedPersonaIds,
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      supportsVideoGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
      videoLimitReached: false,
    };
  }

  if (normalizedPlan === "Premium") {
    return {
      planName: normalizedPlan,
      allowedPersonaIds,
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      supportsVideoGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
      videoLimitReached: false,
    };
  }

  if (normalizedPlan === "Pro") {
    return {
      planName: normalizedPlan,
      allowedPersonaIds,
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      supportsVideoGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
      videoLimitReached: false,
    };
  }

  return {
    planName: "Lite",
    allowedPersonaIds,
    supportsImageGeneration: true,
    supportsAudioGeneration: true,
    supportsVideoGeneration: true,
    imageLimitReached: false,
    audioLimitReached: false,
    videoLimitReached: false,
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
