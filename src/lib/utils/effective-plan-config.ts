import "server-only";

import {
  DEFAULT_PLAN_PRICING,
  PERSONA_TRIAL_LIMITS,
  PLAN_LIMITS,
  PersonaTrialLimits,
  PlanLimits,
  PlanPricing,
} from "@/constants/plans";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PlanName } from "@/types/PlanData.d";

type AppSettingRecord = {
  key: string;
  value: unknown;
};

const PLAN_NAMES: PlanName[] = ["Lite", "Pro", "Premium"];

export interface EffectivePlanConfig {
  pricing: PlanPricing;
  limits: PlanLimits;
  trialLimits: PersonaTrialLimits;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePositiveInteger({
  value,
  fallback,
}: {
  value: unknown;
  fallback: number;
}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  if (value === -1) {
    return -1;
  }

  if (value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizePricingValue(value: unknown): PlanPricing {
  if (Array.isArray(value)) {
    const proPlan = value.find(
      (item): item is { name: string; price?: unknown } =>
        isObjectRecord(item) && item.name === "Pro",
    );
    const premiumPlan = value.find(
      (item): item is { name: string; price?: unknown } =>
        isObjectRecord(item) && item.name === "Premium",
    );

    return {
      Lite: DEFAULT_PLAN_PRICING.Lite,
      Pro: normalizePositiveInteger({
        value: proPlan?.price,
        fallback: DEFAULT_PLAN_PRICING.Pro,
      }),
      Premium: normalizePositiveInteger({
        value: premiumPlan?.price,
        fallback: DEFAULT_PLAN_PRICING.Premium,
      }),
    };
  }

  if (!isObjectRecord(value)) {
    return { ...DEFAULT_PLAN_PRICING };
  }

  return {
    Lite: DEFAULT_PLAN_PRICING.Lite,
    Pro: normalizePositiveInteger({
      value: value.proPrice,
      fallback: DEFAULT_PLAN_PRICING.Pro,
    }),
    Premium: normalizePositiveInteger({
      value: value.premiumPrice,
      fallback: DEFAULT_PLAN_PRICING.Premium,
    }),
  };
}

function normalizePlanLimitsValue(value: unknown): PlanLimits {
  if (!isObjectRecord(value)) {
    return structuredClone(PLAN_LIMITS);
  }

  return {
    Lite: {
      conversationsPerDay: normalizePositiveInteger({
        value: (value.Lite as { conversationsPerDay?: unknown })
          ?.conversationsPerDay,
        fallback: PLAN_LIMITS.Lite.conversationsPerDay,
      }),
      promptsPerConversation: normalizePositiveInteger({
        value: (value.Lite as { promptsPerConversation?: unknown })
          ?.promptsPerConversation,
        fallback: PLAN_LIMITS.Lite.promptsPerConversation,
      }),
      images: normalizePositiveInteger({
        value: (value.Lite as { images?: unknown })?.images,
        fallback: PLAN_LIMITS.Lite.images,
      }),
      audio: normalizePositiveInteger({
        value: (value.Lite as { audio?: unknown })?.audio,
        fallback: PLAN_LIMITS.Lite.audio,
      }),
      video: normalizePositiveInteger({
        value: (value.Lite as { video?: unknown })?.video,
        fallback: PLAN_LIMITS.Lite.video,
      }),
    },
    Pro: {
      conversationsPerDay: normalizePositiveInteger({
        value: (value.Pro as { conversationsPerDay?: unknown })
          ?.conversationsPerDay,
        fallback: PLAN_LIMITS.Pro.conversationsPerDay,
      }),
      promptsPerConversation: normalizePositiveInteger({
        value: (value.Pro as { promptsPerConversation?: unknown })
          ?.promptsPerConversation,
        fallback: PLAN_LIMITS.Pro.promptsPerConversation,
      }),
      images: normalizePositiveInteger({
        value: (value.Pro as { images?: unknown })?.images,
        fallback: PLAN_LIMITS.Pro.images,
      }),
      audio: normalizePositiveInteger({
        value: (value.Pro as { audio?: unknown })?.audio,
        fallback: PLAN_LIMITS.Pro.audio,
      }),
      video: normalizePositiveInteger({
        value: (value.Pro as { video?: unknown })?.video,
        fallback: PLAN_LIMITS.Pro.video,
      }),
    },
    Premium: {
      conversationsPerDay: normalizePositiveInteger({
        value: (value.Premium as { conversationsPerDay?: unknown })
          ?.conversationsPerDay,
        fallback: PLAN_LIMITS.Premium.conversationsPerDay,
      }),
      promptsPerConversation: normalizePositiveInteger({
        value: (value.Premium as { promptsPerConversation?: unknown })
          ?.promptsPerConversation,
        fallback: PLAN_LIMITS.Premium.promptsPerConversation,
      }),
      images: normalizePositiveInteger({
        value: (value.Premium as { images?: unknown })?.images,
        fallback: PLAN_LIMITS.Premium.images,
      }),
      audio: normalizePositiveInteger({
        value: (value.Premium as { audio?: unknown })?.audio,
        fallback: PLAN_LIMITS.Premium.audio,
      }),
      video: normalizePositiveInteger({
        value: (value.Premium as { video?: unknown })?.video,
        fallback: PLAN_LIMITS.Premium.video,
      }),
    },
  };
}

function normalizeTrialLimitsValue(value: unknown): PersonaTrialLimits {
  if (!isObjectRecord(value)) {
    return { ...PERSONA_TRIAL_LIMITS };
  }

  return {
    promptsPerConversation: normalizePositiveInteger({
      value: value.promptsPerConversation,
      fallback: PERSONA_TRIAL_LIMITS.promptsPerConversation,
    }),
    images: normalizePositiveInteger({
      value: value.images,
      fallback: PERSONA_TRIAL_LIMITS.images,
    }),
    audio: normalizePositiveInteger({
      value: value.audio,
      fallback: PERSONA_TRIAL_LIMITS.audio,
    }),
    video: normalizePositiveInteger({
      value: value.video,
      fallback: PERSONA_TRIAL_LIMITS.video,
    }),
  };
}

export async function getEffectivePlanConfig(): Promise<EffectivePlanConfig> {
  await connectToDatabase();

  const settings = (await AppSetting.find({
    key: { $in: ["admin.pricing", "admin.limits", "admin.trialLimits"] },
  })
    .select("key value")
    .lean()) as AppSettingRecord[];
  const settingsMap = new Map(
    settings.map((setting) => [setting.key, setting]),
  );

  const pricingValue = settingsMap.get("admin.pricing")?.value;
  const limitsValue = settingsMap.get("admin.limits")?.value;
  const trialLimitsValue = settingsMap.get("admin.trialLimits")?.value;

  return {
    pricing: normalizePricingValue(pricingValue),
    limits: normalizePlanLimitsValue(limitsValue),
    trialLimits: normalizeTrialLimitsValue(trialLimitsValue),
  };
}

export async function getEffectiveTrialLimits(): Promise<PersonaTrialLimits> {
  await connectToDatabase();

  const setting = (await AppSetting.findOne({ key: "admin.trialLimits" })
    .select("value")
    .lean()) as AppSettingRecord | null;

  return normalizeTrialLimitsValue(setting?.value);
}

export function getPlanLimit({
  limits,
  planName,
  limitType,
}: {
  limits: PlanLimits;
  planName: PlanName;
  limitType: keyof PlanLimits[PlanName];
}): number {
  if (!PLAN_NAMES.includes(planName)) {
    return PLAN_LIMITS.Lite[limitType];
  }

  return limits[planName][limitType];
}
