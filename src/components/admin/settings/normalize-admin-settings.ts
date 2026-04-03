import { PERSONAS, VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import { STOP_REASON_CODES } from "@/constants/stop-reasons";
import { isObjectRecord } from "@/lib/utils/type-guards";
import { ModelSettingsFormValue } from "@/types/AdminData.d";
import { PersonaId } from "@/types/PersonaData.d";
import {
  AboutContentSettingsFormValue,
  FaqContentSettingsFormValue,
  HeroContentSettingsFormValue,
  HomepageCopySettingsFormValue,
  HomepageFeaturedPersonasSettingsFormValue,
  LimitsSettingsFormValue,
  LandingContentSettingsFormValue,
  PersonaAccessSettingsFormValue,
  PersonaContentSettingsFormValue,
  PromoContentSettingsFormValue,
  PricingSettingsFormValue,
  StopReasonMessagesSettingsFormValue,
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

function readStringValue(
  source: Record<string, unknown>,
  key: string,
  fallbackValue: string,
): string {
  return normalizeStringValue(source[key], fallbackValue);
}

function normalizeStringValue(value: unknown, fallbackValue: string): string {
  if (typeof value !== "string") {
    return fallbackValue;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallbackValue;
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

  return {
    liteChatModel,
    proChatModel,
    premiumChatModel,
    imageModel,
    audioModel,
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

export function normalizePromoContentSettings(
  value: unknown,
  defaults: PromoContentSettingsFormValue,
): PromoContentSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    promoTitlePro: readStringValue(
      value,
      "promoTitlePro",
      defaults.promoTitlePro,
    ),
    promoTitlePremium: readStringValue(
      value,
      "promoTitlePremium",
      defaults.promoTitlePremium,
    ),
    promoDescriptionPro: readStringValue(
      value,
      "promoDescriptionPro",
      defaults.promoDescriptionPro,
    ),
    promoDescriptionPremium: readStringValue(
      value,
      "promoDescriptionPremium",
      defaults.promoDescriptionPremium,
    ),
    promoUpgradeCta: readStringValue(
      value,
      "promoUpgradeCta",
      defaults.promoUpgradeCta,
    ),
    promoAdminLabel: readStringValue(
      value,
      "promoAdminLabel",
      defaults.promoAdminLabel,
    ),
    promoAdminDescription: readStringValue(
      value,
      "promoAdminDescription",
      defaults.promoAdminDescription,
    ),
    promoSuspensionTitle: readStringValue(
      value,
      "promoSuspensionTitle",
      defaults.promoSuspensionTitle,
    ),
    promoSuspensionDescription: readStringValue(
      value,
      "promoSuspensionDescription",
      defaults.promoSuspensionDescription,
    ),
    promoFreeLabel: readStringValue(
      value,
      "promoFreeLabel",
      defaults.promoFreeLabel,
    ),
    promoCurrentPlanLabel: readStringValue(
      value,
      "promoCurrentPlanLabel",
      defaults.promoCurrentPlanLabel,
    ),
    promoUpgradeMessage: readStringValue(
      value,
      "promoUpgradeMessage",
      defaults.promoUpgradeMessage,
    ),
    promoTrialLabel: readStringValue(
      value,
      "promoTrialLabel",
      defaults.promoTrialLabel,
    ),
    promoPersonaUpgrade: readStringValue(
      value,
      "promoPersonaUpgrade",
      defaults.promoPersonaUpgrade,
    ),
    promoPersonaUpgradeFallback: readStringValue(
      value,
      "promoPersonaUpgradeFallback",
      defaults.promoPersonaUpgradeFallback,
    ),
    promoContactSupportCta: readStringValue(
      value,
      "promoContactSupportCta",
      defaults.promoContactSupportCta,
    ),
    chatConversationEndedLabel: readStringValue(
      value,
      "chatConversationEndedLabel",
      defaults.chatConversationEndedLabel,
    ),
    chatStartConversationCta: readStringValue(
      value,
      "chatStartConversationCta",
      defaults.chatStartConversationCta,
    ),
    chatUpgradePlanCta: readStringValue(
      value,
      "chatUpgradePlanCta",
      defaults.chatUpgradePlanCta,
    ),
    chatContactSupportCta: readStringValue(
      value,
      "chatContactSupportCta",
      defaults.chatContactSupportCta,
    ),
    chatIntroSubheading: readStringValue(
      value,
      "chatIntroSubheading",
      defaults.chatIntroSubheading,
    ),
    chatInputPlaceholder: readStringValue(
      value,
      "chatInputPlaceholder",
      defaults.chatInputPlaceholder,
    ),
    plansSubscribeCta: readStringValue(
      value,
      "plansSubscribeCta",
      defaults.plansSubscribeCta,
    ),
    planPopularBadge: readStringValue(
      value,
      "planPopularBadge",
      defaults.planPopularBadge,
    ),
  };
}

export function normalizeStopReasonMessagesSettings(
  value: unknown,
  defaults: StopReasonMessagesSettingsFormValue,
): StopReasonMessagesSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return STOP_REASON_CODES.reduce(
    (accumulator, stopReasonCode) => {
      const rawValue = value[stopReasonCode];
      accumulator[stopReasonCode] =
        typeof rawValue === "string" && rawValue.trim().length > 0
          ? rawValue.trim()
          : defaults[stopReasonCode];

      return accumulator;
    },
    { ...defaults } as StopReasonMessagesSettingsFormValue,
  );
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
  };
}

export function normalizeFaqContentSettings(
  value: unknown,
  defaults: FaqContentSettingsFormValue,
): FaqContentSettingsFormValue {
  if (!Array.isArray(value)) {
    return defaults;
  }

  const valueById = new Map<number, unknown>();

  for (const entry of value) {
    if (!isObjectRecord(entry)) {
      continue;
    }

    if (typeof entry.id !== "number" || !Number.isInteger(entry.id)) {
      continue;
    }

    valueById.set(entry.id, entry);
  }

  return defaults.map((defaultFaq) => {
    const faqValue = valueById.get(defaultFaq.id);

    if (!isObjectRecord(faqValue)) {
      return { ...defaultFaq };
    }

    return {
      id: defaultFaq.id,
      question: readStringValue(faqValue, "question", defaultFaq.question),
      answer: readStringValue(faqValue, "answer", defaultFaq.answer),
    };
  });
}

export function normalizeHeroContentSettings(
  value: unknown,
  defaults: HeroContentSettingsFormValue,
): HeroContentSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    heading: readStringValue(value, "heading", defaults.heading),
    subheading: readStringValue(value, "subheading", defaults.subheading),
    ctaLabel: readStringValue(value, "ctaLabel", defaults.ctaLabel),
    imageAlt: readStringValue(value, "imageAlt", defaults.imageAlt),
  };
}

export function normalizeHomepageCopySettings(
  value: unknown,
  defaults: HomepageCopySettingsFormValue,
): HomepageCopySettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    ctaHeading: readStringValue(value, "ctaHeading", defaults.ctaHeading),
    ctaDescription: readStringValue(
      value,
      "ctaDescription",
      defaults.ctaDescription,
    ),
    ctaPrimaryLabel: readStringValue(
      value,
      "ctaPrimaryLabel",
      defaults.ctaPrimaryLabel,
    ),
    ctaSecondaryLabel: readStringValue(
      value,
      "ctaSecondaryLabel",
      defaults.ctaSecondaryLabel,
    ),
    spotlightLabel: readStringValue(
      value,
      "spotlightLabel",
      defaults.spotlightLabel,
    ),
    spotlightHeading: readStringValue(
      value,
      "spotlightHeading",
      defaults.spotlightHeading,
    ),
    spotlightDescription: readStringValue(
      value,
      "spotlightDescription",
      defaults.spotlightDescription,
    ),
  };
}

export function normalizeHomepageFeaturedPersonasSettings(
  value: unknown,
  defaults: HomepageFeaturedPersonasSettingsFormValue,
): HomepageFeaturedPersonasSettingsFormValue {
  if (!Array.isArray(value)) {
    return [...defaults];
  }

  const resolvedPersonaIds: PersonaId[] = [];
  const seenPersonaIds = new Set<PersonaId>();

  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      !VALID_PERSONA_ID_SET.has(entry as PersonaId)
    ) {
      continue;
    }

    const personaId = entry as PersonaId;

    if (seenPersonaIds.has(personaId)) {
      continue;
    }

    seenPersonaIds.add(personaId);
    resolvedPersonaIds.push(personaId);
  }

  return resolvedPersonaIds.length > 0 ? resolvedPersonaIds : [...defaults];
}

function normalizeLandingFeatureCards({
  value,
  defaults,
}: {
  value: unknown;
  defaults: LandingContentSettingsFormValue["featureCards"];
}): LandingContentSettingsFormValue["featureCards"] {
  if (!Array.isArray(value)) {
    return defaults.map((card) => ({ ...card }));
  }

  return defaults.map((defaultCard, index) => {
    const cardValue = value[index];

    if (!isObjectRecord(cardValue)) {
      return { ...defaultCard };
    }

    return {
      icon: readStringValue(cardValue, "icon", defaultCard.icon),
      title: readStringValue(cardValue, "title", defaultCard.title),
      description: readStringValue(
        cardValue,
        "description",
        defaultCard.description,
      ),
    };
  });
}

function normalizeLandingHowItWorksSteps({
  value,
  defaults,
}: {
  value: unknown;
  defaults: LandingContentSettingsFormValue["howItWorksSteps"];
}): LandingContentSettingsFormValue["howItWorksSteps"] {
  if (!Array.isArray(value)) {
    return defaults.map((step) => ({ ...step }));
  }

  return defaults.map((defaultStep, index) => {
    const stepValue = value[index];

    if (!isObjectRecord(stepValue)) {
      return { ...defaultStep };
    }

    return {
      step: readStringValue(stepValue, "step", defaultStep.step),
      title: readStringValue(stepValue, "title", defaultStep.title),
      description: readStringValue(
        stepValue,
        "description",
        defaultStep.description,
      ),
    };
  });
}

function normalizeLandingWorkflowCopy({
  value,
  defaults,
}: {
  value: unknown;
  defaults: LandingContentSettingsFormValue["workflow"];
}): LandingContentSettingsFormValue["workflow"] {
  if (!isObjectRecord(value)) {
    return {
      ...defaults,
      rhythmCards: defaults.rhythmCards.map((card) => ({ ...card })),
    };
  }

  const rhythmCardsSource = Array.isArray(value.rhythmCards)
    ? value.rhythmCards
    : [];

  return {
    eyebrow: readStringValue(value, "eyebrow", defaults.eyebrow),
    title: readStringValue(value, "title", defaults.title),
    description: readStringValue(value, "description", defaults.description),
    rhythmEyebrow: readStringValue(
      value,
      "rhythmEyebrow",
      defaults.rhythmEyebrow,
    ),
    rhythmCards: defaults.rhythmCards.map((defaultCard, index) => {
      const cardValue = rhythmCardsSource[index];

      if (!isObjectRecord(cardValue)) {
        return { ...defaultCard };
      }

      return {
        label: readStringValue(cardValue, "label", defaultCard.label),
        detail: readStringValue(cardValue, "detail", defaultCard.detail),
      };
    }),
  };
}

export function normalizeLandingContentSettings(
  value: unknown,
  defaults: LandingContentSettingsFormValue,
): LandingContentSettingsFormValue {
  if (!isObjectRecord(value)) {
    return {
      ...defaults,
      featureCards: defaults.featureCards.map((card) => ({ ...card })),
      howItWorksSteps: defaults.howItWorksSteps.map((step) => ({ ...step })),
      workflow: {
        ...defaults.workflow,
        rhythmCards: defaults.workflow.rhythmCards.map((card) => ({ ...card })),
      },
    };
  }

  return {
    featureCards: normalizeLandingFeatureCards({
      value: value.featureCards,
      defaults: defaults.featureCards,
    }),
    howItWorksSteps: normalizeLandingHowItWorksSteps({
      value: value.howItWorksSteps,
      defaults: defaults.howItWorksSteps,
    }),
    workflow: normalizeLandingWorkflowCopy({
      value: value.workflow,
      defaults: defaults.workflow,
    }),
  };
}

export function normalizeAboutContentSettings(
  value: unknown,
  defaults: AboutContentSettingsFormValue,
): AboutContentSettingsFormValue {
  if (!isObjectRecord(value)) {
    return {
      ...defaults,
      sections: defaults.sections.map((section) => ({
        ...section,
        paragraphs: [...section.paragraphs],
      })),
    };
  }

  const sectionsSource = Array.isArray(value.sections) ? value.sections : [];
  const sectionById = new Map<string, unknown>();

  for (const section of sectionsSource) {
    if (!isObjectRecord(section)) {
      continue;
    }

    if (typeof section.id !== "string") {
      continue;
    }

    sectionById.set(section.id, section);
  }

  return {
    pageTitle: readStringValue(value, "pageTitle", defaults.pageTitle),
    pageSubtitle: readStringValue(value, "pageSubtitle", defaults.pageSubtitle),
    sections: defaults.sections.map((defaultSection) => {
      const sectionValue = sectionById.get(defaultSection.id);

      if (!isObjectRecord(sectionValue)) {
        return {
          ...defaultSection,
          paragraphs: [...defaultSection.paragraphs],
        };
      }

      const paragraphsSource = Array.isArray(sectionValue.paragraphs)
        ? sectionValue.paragraphs
        : [];

      return {
        id: defaultSection.id,
        visualType: defaultSection.visualType,
        eyebrow: readStringValue(
          sectionValue,
          "eyebrow",
          defaultSection.eyebrow,
        ),
        title: readStringValue(sectionValue, "title", defaultSection.title),
        paragraphs: defaultSection.paragraphs.map((fallbackParagraph, index) =>
          normalizeStringValue(paragraphsSource[index], fallbackParagraph),
        ),
      };
    }),
    ctaTitle: readStringValue(value, "ctaTitle", defaults.ctaTitle),
    ctaDescription: readStringValue(
      value,
      "ctaDescription",
      defaults.ctaDescription,
    ),
    ctaPrimaryLabel: readStringValue(
      value,
      "ctaPrimaryLabel",
      defaults.ctaPrimaryLabel,
    ),
    ctaSecondaryLabel: readStringValue(
      value,
      "ctaSecondaryLabel",
      defaults.ctaSecondaryLabel,
    ),
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
