import "server-only";

import {
  DEFAULT_PLAN_PRICING,
  PERSONA_TRIAL_LIMITS,
  PLAN_LIMITS,
  PersonaTrialLimits,
  PlanLimits,
  PlanPricing,
} from "@/constants/plans";
import { SUPPORT_EMAIL } from "@/constants/support";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { isObjectRecord } from "@/lib/utils/type-guards";

type AppSettingRecord = {
  key: string;
  value: unknown;
};

const DEFAULT_CURRENCY_SYMBOL = "$";

export interface EffectivePlanConfig {
  pricing: PlanPricing;
  limits: PlanLimits;
  trialLimits: PersonaTrialLimits;
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
  const normalizedCurrencySymbol =
    isObjectRecord(value) && typeof value.currencySymbol === "string"
      ? normalizeCurrencySymbol(value.currencySymbol)
      : DEFAULT_PLAN_PRICING.currencySymbol;

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
      currencySymbol: DEFAULT_PLAN_PRICING.currencySymbol,
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
    currencySymbol: normalizedCurrencySymbol,
  };
}

function normalizeCurrencySymbol(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_CURRENCY_SYMBOL;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "$" || trimmedValue === "€") {
    return trimmedValue;
  }

  return DEFAULT_CURRENCY_SYMBOL;
}

function normalizeSupportEmail(value: unknown): string {
  if (typeof value !== "string") {
    return SUPPORT_EMAIL;
  }

  const trimmedValue = value.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(trimmedValue) ? trimmedValue : SUPPORT_EMAIL;
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
  };
}

export async function getEffectivePlanConfig(): Promise<EffectivePlanConfig> {
  try {
    await connectToDatabase();

    const settings = (await AppSetting.find({
      key: {
        $in: [
          "admin.pricing",
          "admin.limits",
          "admin.trialLimits",
          "admin.currencySymbol",
        ],
      },
    })
      .select("key value")
      .lean()) as AppSettingRecord[];
    const settingsMap = new Map(
      settings.map((setting) => [setting.key, setting]),
    );

    const pricingValue = settingsMap.get("admin.pricing")?.value;
    const currencySymbolValue = settingsMap.get("admin.currencySymbol")?.value;
    const limitsValue = settingsMap.get("admin.limits")?.value;
    const trialLimitsValue = settingsMap.get("admin.trialLimits")?.value;
    const normalizedPricing = normalizePricingValue(pricingValue);

    return {
      pricing: {
        ...normalizedPricing,
        currencySymbol:
          currencySymbolValue !== undefined
            ? normalizeCurrencySymbol(currencySymbolValue)
            : normalizedPricing.currencySymbol,
      },
      limits: normalizePlanLimitsValue(limitsValue),
      trialLimits: normalizeTrialLimitsValue(trialLimitsValue),
    };
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return {
      pricing: { ...DEFAULT_PLAN_PRICING },
      limits: structuredClone(PLAN_LIMITS),
      trialLimits: { ...PERSONA_TRIAL_LIMITS },
    };
  }
}

export async function getEffectiveCurrencySymbol(): Promise<string> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({ key: "admin.currencySymbol" })
      .select("value")
      .lean()) as AppSettingRecord | null;

    return normalizeCurrencySymbol(setting?.value);
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return DEFAULT_PLAN_PRICING.currencySymbol;
  }
}

export async function getEffectiveSupportEmail(): Promise<string> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({ key: "admin.supportEmail" })
      .select("value")
      .lean()) as AppSettingRecord | null;

    return normalizeSupportEmail(setting?.value);
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return SUPPORT_EMAIL;
  }
}
