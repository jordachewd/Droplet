import "server-only";

import { BillingCycle, Plan, PlanName } from "@/types/PlanData.d";
import { PersonaId } from "@/types/PersonaData.d";
import { PERSONAS } from "@/constants/assistant-personas";

const LITE_NEVER_EXPIRES_ON = "9999-12-31T23:59:59.999Z";

export type PlanLimits = Record<
  PlanName,
  {
    images: number;
    audio: number;
    conversationsPerDay: number;
    promptsPerConversation: number;
  }
>;

export type PlanPricing = Record<PlanName, number> & {
  currencySymbol: string;
};

export const DEFAULT_PLAN_PRICING: PlanPricing = {
  Lite: 0,
  Pro: 19,
  Premium: 39,
  currencySymbol: "$",
};

export const PLAN_LIMITS: PlanLimits = {
  Lite: {
    images: 3,
    audio: 3,
    conversationsPerDay: 5,
    promptsPerConversation: 10,
  },
  Pro: {
    images: 50,
    audio: 50,
    conversationsPerDay: 50,
    promptsPerConversation: 100,
  },
  Premium: {
    images: -1,
    audio: -1,
    conversationsPerDay: -1,
    promptsPerConversation: -1,
  },
};

export const PERSONA_TRIAL_LIMITS = {
  promptsPerConversation: 5,
  images: 3,
  audio: 2,
} as const;

export interface PersonaTrialLimits {
  promptsPerConversation: number;
  images: number;
  audio: number;
}

type PersonaAccessByPlan = Record<PlanName, PersonaId[]>;

const DEFAULT_PERSONA_ACCESS_BY_PLAN: PersonaAccessByPlan = {
  Lite: ["strategist", "developer"],
  Pro: ["strategist", "developer", "teacher", "creator", "wellness"],
  Premium: PERSONAS.map((persona) => persona.id),
};

export function getExpiresOn(plan: PlanName, billing?: BillingCycle): Date {
  const currentDate = new Date();

  switch (plan) {
    case "Lite":
      return new Date(LITE_NEVER_EXPIRES_ON);
    case "Pro":
    case "Premium":
      switch (billing) {
        case "Monthly":
          return new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        case "Yearly":
          return new Date(
            currentDate.setFullYear(currentDate.getFullYear() + 1),
          );
      }
  }

  return new Date(currentDate);
}

function formatConversationsLabel(limit: number): string {
  return limit === -1
    ? "Unlimited conversations"
    : `${limit} conversations per day`;
}

function formatPromptsLabel(limit: number): string {
  return limit === -1
    ? "Unlimited prompts"
    : `${limit} prompts per conversation`;
}

function formatMediaLimitLabel({
  limit,
  singular,
  plural,
  suffix,
}: {
  limit: number;
  singular: string;
  plural: string;
  suffix: string;
}): string {
  if (limit === -1) {
    return `Unlimited ${plural}${suffix}`;
  }

  if (limit === 0) {
    return `✕ ${plural}${suffix}`;
  }

  const noun = limit === 1 ? singular : plural;
  return `${limit} ${noun}${suffix}`;
}

export function buildPlans({
  pricing = DEFAULT_PLAN_PRICING,
  limits = PLAN_LIMITS,
  personaAccess = DEFAULT_PERSONA_ACCESS_BY_PLAN,
  trialLimits = PERSONA_TRIAL_LIMITS,
}: {
  pricing?: PlanPricing;
  limits?: PlanLimits;
  personaAccess?: PersonaAccessByPlan;
  trialLimits?: PersonaTrialLimits;
} = {}): Plan[] {
  const totalPersonaCount = PERSONAS.length;

  function formatPersonaAccess(planName: PlanName): string {
    const fullAccessCount = personaAccess[planName].length;
    const limitedCount = Math.max(0, totalPersonaCount - fullAccessCount);

    if (limitedCount === 0) {
      return `All ${fullAccessCount} personas (full access)`;
    }

    return `${fullAccessCount} personas (full access) + try all others (limited access)`;
  }

  const trialLimitsLabel = `Trial personas: ${trialLimits.promptsPerConversation} prompts, ${trialLimits.images} images, ${trialLimits.audio} audio / 30 days`;

  return [
    {
      id: 0,
      price: pricing.Lite,
      name: "Lite",
      desc: "Free forever",
      icon: "bi bi-lightning",
      inclusions: [
        {
          label: "AI chat assistant",
          isIncluded: true,
        },
        {
          label: formatPersonaAccess("Lite"),
          isIncluded: true,
        },
        {
          label: trialLimitsLabel,
          isIncluded: true,
        },
        {
          label: formatConversationsLabel(limits.Lite.conversationsPerDay),
          isIncluded: limits.Lite.conversationsPerDay !== 0,
        },
        {
          label: formatPromptsLabel(limits.Lite.promptsPerConversation),
          isIncluded: limits.Lite.promptsPerConversation !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Lite.images,
            singular: "image generation",
            plural: "image generations",
            suffix: " per month",
          }),
          isIncluded: limits.Lite.images !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Lite.audio,
            singular: "audio generation",
            plural: "audio generations",
            suffix: " per month",
          }),
          isIncluded: limits.Lite.audio !== 0,
        },
        {
          label: "File uploads (limited)",
          isIncluded: true,
        },
        {
          label: "Email support",
          isIncluded: false,
        },
      ],
    },
    {
      id: 1,
      price: pricing.Pro,
      name: "Pro",
      desc: "Advanced AI for power users",
      icon: "bi bi-stars",
      inclusions: [
        {
          label: "Advanced AI model",
          isIncluded: true,
        },
        {
          label: formatPersonaAccess("Pro"),
          isIncluded: true,
        },
        {
          label: trialLimitsLabel,
          isIncluded: true,
        },
        {
          label: formatConversationsLabel(limits.Pro.conversationsPerDay),
          isIncluded: limits.Pro.conversationsPerDay !== 0,
        },
        {
          label: formatPromptsLabel(limits.Pro.promptsPerConversation),
          isIncluded: limits.Pro.promptsPerConversation !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Pro.images,
            singular: "image generation",
            plural: "image generations",
            suffix: " per month",
          }),
          isIncluded: limits.Pro.images !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Pro.audio,
            singular: "audio generation",
            plural: "audio generations",
            suffix: " per month",
          }),
          isIncluded: limits.Pro.audio !== 0,
        },
        {
          label: "Unlimited file uploads",
          isIncluded: true,
        },
        {
          label: "Email support",
          isIncluded: true,
        },
        {
          label: "Premium media quality",
          isIncluded: false,
        },
      ],
    },
    {
      id: 2,
      price: pricing.Premium,
      name: "Premium",
      desc: "Ultimate AI experience with premium media",
      icon: "bi bi-gem",
      inclusions: [
        {
          label: "Best AI model",
          isIncluded: true,
        },
        {
          label: formatPersonaAccess("Premium"),
          isIncluded: true,
        },
        {
          label: formatConversationsLabel(limits.Premium.conversationsPerDay),
          isIncluded: limits.Premium.conversationsPerDay !== 0,
        },
        {
          label: formatPromptsLabel(limits.Premium.promptsPerConversation),
          isIncluded: limits.Premium.promptsPerConversation !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Premium.images,
            singular: "image generation",
            plural: "image generations",
            suffix: "",
          }),
          isIncluded: limits.Premium.images !== 0,
        },
        {
          label: formatMediaLimitLabel({
            limit: limits.Premium.audio,
            singular: "audio generation",
            plural: "audio generations",
            suffix: "",
          }),
          isIncluded: limits.Premium.audio !== 0,
        },
        {
          label: "Quality image generation (Premium)",
          isIncluded: true,
        },
        {
          label: "Quality audio generation (Premium)",
          isIncluded: true,
        },
        {
          label: "Priority email support",
          isIncluded: true,
        },
      ],
    },
  ];
}

export const plans = buildPlans();

export function getPlanIcon(name: PlanName) {
  if (!name) return;

  const plan = plans.find(
    (plan) => plan.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (!plan) {
    throw new Error(`No plan found with the name: ${name}`);
  }

  return plan.icon;
}
