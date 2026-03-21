import { PERSONAS, VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import { isObjectRecord } from "@/lib/utils/type-guards";
import { ModelSettingsFormValue } from "@/types/AdminData.d";
import { PersonaId } from "@/types/PersonaData.d";
import {
  LimitsSettingsFormValue,
  PersonaAccessSettingsFormValue,
  PersonaContentSettingsFormValue,
  PricingSettingsFormValue,
  SupportSettingsFormValue,
  ThemeSettingsFormValue,
  TrialLimitsSettingsFormValue,
  PERSONA_ACCESS_KEY_BY_PLAN,
} from "@/components/admin/settings/types";

function readNumericValue(
  source: Record<string, unknown>,
  key: string,
  fallbackValue: number,
): number {
  const rawValue = source[key];
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return fallbackValue;
  }

  return rawValue;
}

export function normalizeModelSettingsValue(
  value: unknown,
  defaults: ModelSettingsFormValue,
): ModelSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  const liteChatModel =
    typeof value.liteChatModel === "string"
      ? value.liteChatModel
      : defaults.liteChatModel;
  const proChatModel =
    typeof value.proChatModel === "string"
      ? value.proChatModel
      : defaults.proChatModel;
  const premiumChatModel =
    typeof value.premiumChatModel === "string"
      ? value.premiumChatModel
      : defaults.premiumChatModel;
  const imageModel =
    typeof value.imageModel === "string"
      ? value.imageModel
      : defaults.imageModel;
  const audioModel =
    typeof value.audioModel === "string"
      ? value.audioModel
      : defaults.audioModel;
  const videoModel =
    typeof value.videoModel === "string"
      ? value.videoModel
      : defaults.videoModel;

  return {
    liteChatModel,
    proChatModel,
    premiumChatModel,
    imageModel,
    audioModel,
    videoModel,
  };
}

export function normalizePricingSettingsValue(
  value: unknown,
  defaults: PricingSettingsFormValue,
): PricingSettingsFormValue {
  if (Array.isArray(value)) {
    const proPlan = value.find(
      (item): item is { name: string; price?: number } =>
        isObjectRecord(item) && item.name === "Pro",
    );
    const premiumPlan = value.find(
      (item): item is { name: string; price?: number } =>
        isObjectRecord(item) && item.name === "Premium",
    );

    return {
      proPrice:
        typeof proPlan?.price === "number" && Number.isFinite(proPlan.price)
          ? proPlan.price
          : defaults.proPrice,
      premiumPrice:
        typeof premiumPlan?.price === "number" &&
        Number.isFinite(premiumPlan.price)
          ? premiumPlan.price
          : defaults.premiumPrice,
      currencySymbol: defaults.currencySymbol,
    };
  }

  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    proPrice: readNumericValue(value, "proPrice", defaults.proPrice),
    premiumPrice: readNumericValue(
      value,
      "premiumPrice",
      defaults.premiumPrice,
    ),
    currencySymbol:
      value.currencySymbol === "€" || value.currencySymbol === "$"
        ? value.currencySymbol
        : defaults.currencySymbol,
  };
}

export function normalizeLimitsSettingsValue(
  value: unknown,
  defaults: LimitsSettingsFormValue,
): LimitsSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  const liteValue = isObjectRecord(value.Lite) ? value.Lite : {};
  const proValue = isObjectRecord(value.Pro) ? value.Pro : {};
  const premiumValue = isObjectRecord(value.Premium) ? value.Premium : {};

  return {
    Lite: {
      conversationsPerDay: readNumericValue(
        liteValue,
        "conversationsPerDay",
        defaults.Lite.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        liteValue,
        "promptsPerConversation",
        defaults.Lite.promptsPerConversation,
      ),
      images: readNumericValue(liteValue, "images", defaults.Lite.images),
      audio: readNumericValue(liteValue, "audio", defaults.Lite.audio),
      video: readNumericValue(liteValue, "video", defaults.Lite.video),
    },
    Pro: {
      conversationsPerDay: readNumericValue(
        proValue,
        "conversationsPerDay",
        defaults.Pro.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        proValue,
        "promptsPerConversation",
        defaults.Pro.promptsPerConversation,
      ),
      images: readNumericValue(proValue, "images", defaults.Pro.images),
      audio: readNumericValue(proValue, "audio", defaults.Pro.audio),
      video: readNumericValue(proValue, "video", defaults.Pro.video),
    },
    Premium: {
      conversationsPerDay: readNumericValue(
        premiumValue,
        "conversationsPerDay",
        defaults.Premium.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        premiumValue,
        "promptsPerConversation",
        defaults.Premium.promptsPerConversation,
      ),
      images: readNumericValue(premiumValue, "images", defaults.Premium.images),
      audio: readNumericValue(premiumValue, "audio", defaults.Premium.audio),
      video: readNumericValue(premiumValue, "video", defaults.Premium.video),
    },
  };
}

export function normalizeThemeSettingsValue(
  value: unknown,
  defaults: ThemeSettingsFormValue,
): ThemeSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    defaultMode: value.defaultMode === "dark" ? "dark" : defaults.defaultMode,
  };
}

export function normalizeSupportSettingsValue(
  value: unknown,
  defaults: SupportSettingsFormValue,
): SupportSettingsFormValue {
  if (typeof value !== "string") {
    return defaults;
  }

  const trimmedValue = value.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(trimmedValue)
    ? { supportEmail: trimmedValue }
    : defaults;
}

export function normalizeTrialLimitsSettingsValue(
  value: unknown,
  defaults: TrialLimitsSettingsFormValue,
): TrialLimitsSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    promptsPerConversation: readNumericValue(
      value,
      "promptsPerConversation",
      defaults.promptsPerConversation,
    ),
    images: readNumericValue(value, "images", defaults.images),
    audio: readNumericValue(value, "audio", defaults.audio),
    video: readNumericValue(value, "video", defaults.video),
  };
}

function normalizePersonaAccessValue(
  value: unknown,
  fallback: PersonaId[],
): PersonaId[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter(
    (entry): entry is PersonaId =>
      typeof entry === "string" && VALID_PERSONA_ID_SET.has(entry as PersonaId),
  );
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

  const normalizedStarterPrompts = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return normalizedStarterPrompts.length > 0
    ? normalizedStarterPrompts
    : fallback;
}

function normalizePersonaContentText({
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

export function normalizePersonaAccessSettings(
  settingsByKey: Record<string, { value: unknown }>,
  defaults: PersonaAccessSettingsFormValue,
): PersonaAccessSettingsFormValue {
  return {
    Lite: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Lite]?.value,
      defaults.Lite,
    ),
    Pro: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Pro]?.value,
      defaults.Pro,
    ),
    Premium: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Premium]?.value,
      defaults.Premium,
    ),
  };
}

export function normalizePersonaContentSettings(
  value: unknown,
  defaults: PersonaContentSettingsFormValue,
): PersonaContentSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return PERSONAS.reduce((accumulator, persona) => {
    const defaultValue = defaults[persona.id];
    const personaValue = isObjectRecord(value[persona.id])
      ? (value[persona.id] as Record<string, unknown>)
      : ({} as Record<string, unknown>);

    accumulator[persona.id] = {
      label: normalizePersonaContentText({
        value: personaValue.label,
        fallback: defaultValue.label,
      }),
      tagline: normalizePersonaContentText({
        value: personaValue.tagline,
        fallback: defaultValue.tagline,
      }),
      description: normalizePersonaContentText({
        value: personaValue.description,
        fallback: defaultValue.description,
      }),
      starterPrompts: normalizeStarterPrompts({
        value: personaValue.starterPrompts,
        fallback: defaultValue.starterPrompts,
      }),
    };

    return accumulator;
  }, {} as PersonaContentSettingsFormValue);
}
