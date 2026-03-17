import {
  DEFAULT_PERSONA_ID,
  PERSONAS,
  getPersona,
} from "@/constants/assistant-personas";
import { PLAN_LIMITS, PlanLimits } from "@/constants/plans";
import { PersonaAccessLevel, PersonaId } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";

export interface Entitlements {
  planName: PlanName;
  limits: PlanLimits[PlanName];
  personaAccess?: Record<PersonaId, PersonaAccessLevel>;
  allowedPersonaIds: PersonaId[];
  trialPersonaIds?: PersonaId[];
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
  isAdmin?: boolean;
  now?: Date;
  planLimits?: PlanLimits;
  fullPersonaAccessByPlan?: Partial<Record<PlanName, PersonaId[]>>;
}

export const DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN: Record<
  PlanName,
  PersonaId[]
> = {
  Lite: ["strategist", "developer"],
  Pro: ["strategist", "developer", "teacher", "creator", "wellness"],
  Premium: PERSONAS.map((persona) => persona.id),
};

export function getRequiredPlanForPersona(
  personaId: PersonaId,
  fullPersonaAccessByPlan: Record<PlanName, PersonaId[]>,
): "Pro" | "Premium" | null {
  if (fullPersonaAccessByPlan.Lite.includes(personaId)) return null;
  if (fullPersonaAccessByPlan.Pro.includes(personaId)) return "Pro";
  if (fullPersonaAccessByPlan.Premium.includes(personaId)) return "Premium";
  return null;
}

function buildPersonaAccessByPlan(
  planName: PlanName,
  fullPersonaAccessByPlan: Record<PlanName, PersonaId[]>,
): Record<PersonaId, PersonaAccessLevel> {
  const fullPersonaSet = new Set(fullPersonaAccessByPlan[planName]);

  return PERSONAS.reduce(
    (accumulator, persona) => {
      accumulator[persona.id] = fullPersonaSet.has(persona.id)
        ? "full"
        : "limited";
      return accumulator;
    },
    {} as Record<PersonaId, PersonaAccessLevel>,
  );
}

function resolveFullPersonaAccessByPlan(
  overrides?: Partial<Record<PlanName, PersonaId[]>>,
): Record<PlanName, PersonaId[]> {
  return {
    Lite: overrides?.Lite ?? DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite,
    Pro: overrides?.Pro ?? DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro,
    Premium: overrides?.Premium ?? DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium,
  };
}

function buildBlockedPersonaAccess(): Record<PersonaId, PersonaAccessLevel> {
  return PERSONAS.reduce(
    (accumulator, persona) => {
      accumulator[persona.id] = "blocked";
      return accumulator;
    },
    {} as Record<PersonaId, PersonaAccessLevel>,
  );
}

function buildFullPersonaAccess(): Record<PersonaId, PersonaAccessLevel> {
  return PERSONAS.reduce(
    (accumulator, persona) => {
      accumulator[persona.id] = "full";
      return accumulator;
    },
    {} as Record<PersonaId, PersonaAccessLevel>,
  );
}

function getAllowedPersonaIds(
  personaAccess: Record<PersonaId, PersonaAccessLevel>,
): PersonaId[] {
  return PERSONAS.filter(
    (persona) => personaAccess[persona.id] !== "blocked",
  ).map((persona) => persona.id);
}

function getTrialPersonaIds(
  personaAccess: Record<PersonaId, PersonaAccessLevel>,
): PersonaId[] {
  return PERSONAS.filter(
    (persona) => personaAccess[persona.id] === "limited",
  ).map((persona) => persona.id);
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
  const planLimits = options.planLimits ?? PLAN_LIMITS;
  const fullPersonaAccessByPlan = resolveFullPersonaAccessByPlan(
    options.fullPersonaAccessByPlan,
  );

  if (options.isSuspended) {
    const personaAccess = buildBlockedPersonaAccess();

    return {
      planName: normalizedPlan,
      limits: planLimits[normalizedPlan],
      personaAccess,
      allowedPersonaIds: [],
      trialPersonaIds: [],
      supportsImageGeneration: false,
      supportsAudioGeneration: false,
      supportsVideoGeneration: false,
      imageLimitReached: true,
      audioLimitReached: true,
      videoLimitReached: true,
    };
  }

  if (options.isAdmin) {
    const personaAccess = buildFullPersonaAccess();

    return {
      planName: normalizedPlan,
      limits: {
        conversationsPerDay: -1,
        promptsPerConversation: -1,
        images: -1,
        audio: -1,
        video: -1,
      },
      personaAccess,
      allowedPersonaIds: getAllowedPersonaIds(personaAccess),
      trialPersonaIds: [],
      supportsImageGeneration: true,
      supportsAudioGeneration: true,
      supportsVideoGeneration: true,
      imageLimitReached: false,
      audioLimitReached: false,
      videoLimitReached: false,
    };
  }

  const effectivePlanName: PlanName = isPaidPlanExpired({
    planName: normalizedPlan,
    expiresOn: options.expiresOn,
    now,
  })
    ? "Lite"
    : normalizedPlan;
  const personaAccess = buildPersonaAccessByPlan(
    effectivePlanName,
    fullPersonaAccessByPlan,
  );

  return {
    planName: effectivePlanName,
    limits: planLimits[effectivePlanName],
    personaAccess,
    allowedPersonaIds: getAllowedPersonaIds(personaAccess),
    trialPersonaIds: getTrialPersonaIds(personaAccess),
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
