import {
  DEFAULT_PERSONA_ID,
  PERSONAS,
  getPersona,
} from "@/constants/assistant-personas";
import { PLAN_LIMITS, PlanLimits } from "@/constants/plans";
import { PersonaId } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";

export interface Entitlements {
  planName: PlanName;
  limits: PlanLimits[PlanName];
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
  planLimits?: PlanLimits;
}

export const DEFAULT_PERSONA_ACCESS_BY_PLAN: Record<PlanName, PersonaId[]> = {
  Lite: ["strategist", "developer", "best-friend"],
  Pro: [
    "strategist",
    "developer",
    "best-friend",
    "teacher",
    "wellness",
    "boyfriend",
    "girlfriend",
  ],
  Premium: PERSONAS.map((persona) => persona.id),
};

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
  const planLimits = options.planLimits ?? PLAN_LIMITS;

  if (options.isSuspended) {
    return {
      planName: normalizedPlan,
      limits: planLimits[normalizedPlan],
      allowedPersonaIds: [],
      supportsImageGeneration: false,
      supportsAudioGeneration: false,
      supportsVideoGeneration: false,
      imageLimitReached: true,
      audioLimitReached: true,
      videoLimitReached: true,
    };
  }

  const effectivePlanName: PlanName = isPaidPlanExpired({
    planName: normalizedPlan,
    expiresOn: options.expiresOn,
    now,
  })
    ? "Lite"
    : normalizedPlan;

  return {
    planName: effectivePlanName,
    limits: planLimits[effectivePlanName],
    allowedPersonaIds: [...DEFAULT_PERSONA_ACCESS_BY_PLAN[effectivePlanName]],
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
