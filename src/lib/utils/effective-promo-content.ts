import "server-only";

import { DEFAULT_PROMO_CONTENT, PromoContent } from "@/constants/promo-content";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { isObjectRecord } from "@/lib/utils/type-guards";

type AppSettingRecord = {
  value?: unknown;
};

function normalizePromoText({
  value,
  fallback,
}: {
  value: unknown;
  fallback: string;
}): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : fallback;
}

function normalizePromoContent(value: unknown): PromoContent {
  if (!isObjectRecord(value)) {
    return { ...DEFAULT_PROMO_CONTENT };
  }

  return {
    promoTitlePro: normalizePromoText({
      value: value.promoTitlePro,
      fallback: DEFAULT_PROMO_CONTENT.promoTitlePro,
    }),
    promoTitlePremium: normalizePromoText({
      value: value.promoTitlePremium,
      fallback: DEFAULT_PROMO_CONTENT.promoTitlePremium,
    }),
    promoDescriptionPro: normalizePromoText({
      value: value.promoDescriptionPro,
      fallback: DEFAULT_PROMO_CONTENT.promoDescriptionPro,
    }),
    promoDescriptionPremium: normalizePromoText({
      value: value.promoDescriptionPremium,
      fallback: DEFAULT_PROMO_CONTENT.promoDescriptionPremium,
    }),
    promoUpgradeCta: normalizePromoText({
      value: value.promoUpgradeCta,
      fallback: DEFAULT_PROMO_CONTENT.promoUpgradeCta,
    }),
    promoAdminLabel: normalizePromoText({
      value: value.promoAdminLabel,
      fallback: DEFAULT_PROMO_CONTENT.promoAdminLabel,
    }),
    promoAdminDescription: normalizePromoText({
      value: value.promoAdminDescription,
      fallback: DEFAULT_PROMO_CONTENT.promoAdminDescription,
    }),
    promoSuspensionTitle: normalizePromoText({
      value: value.promoSuspensionTitle,
      fallback: DEFAULT_PROMO_CONTENT.promoSuspensionTitle,
    }),
    promoSuspensionDescription: normalizePromoText({
      value: value.promoSuspensionDescription,
      fallback: DEFAULT_PROMO_CONTENT.promoSuspensionDescription,
    }),
    promoFreeLabel: normalizePromoText({
      value: value.promoFreeLabel,
      fallback: DEFAULT_PROMO_CONTENT.promoFreeLabel,
    }),
    promoCurrentPlanLabel: normalizePromoText({
      value: value.promoCurrentPlanLabel,
      fallback: DEFAULT_PROMO_CONTENT.promoCurrentPlanLabel,
    }),
    promoUpgradeMessage: normalizePromoText({
      value: value.promoUpgradeMessage,
      fallback: DEFAULT_PROMO_CONTENT.promoUpgradeMessage,
    }),
    promoTrialLabel: normalizePromoText({
      value: value.promoTrialLabel,
      fallback: DEFAULT_PROMO_CONTENT.promoTrialLabel,
    }),
    promoPersonaUpgrade: normalizePromoText({
      value: value.promoPersonaUpgrade,
      fallback: DEFAULT_PROMO_CONTENT.promoPersonaUpgrade,
    }),
    promoPersonaUpgradeFallback: normalizePromoText({
      value: value.promoPersonaUpgradeFallback,
      fallback: DEFAULT_PROMO_CONTENT.promoPersonaUpgradeFallback,
    }),
    promoContactSupportCta: normalizePromoText({
      value: value.promoContactSupportCta,
      fallback: DEFAULT_PROMO_CONTENT.promoContactSupportCta,
    }),
    chatConversationEndedLabel: normalizePromoText({
      value: value.chatConversationEndedLabel,
      fallback: DEFAULT_PROMO_CONTENT.chatConversationEndedLabel,
    }),
    chatStartConversationCta: normalizePromoText({
      value: value.chatStartConversationCta,
      fallback: DEFAULT_PROMO_CONTENT.chatStartConversationCta,
    }),
    chatUpgradePlanCta: normalizePromoText({
      value: value.chatUpgradePlanCta,
      fallback: DEFAULT_PROMO_CONTENT.chatUpgradePlanCta,
    }),
    chatContactSupportCta: normalizePromoText({
      value: value.chatContactSupportCta,
      fallback: DEFAULT_PROMO_CONTENT.chatContactSupportCta,
    }),
    chatIntroSubheading: normalizePromoText({
      value: value.chatIntroSubheading,
      fallback: DEFAULT_PROMO_CONTENT.chatIntroSubheading,
    }),
    chatInputPlaceholder: normalizePromoText({
      value: value.chatInputPlaceholder,
      fallback: DEFAULT_PROMO_CONTENT.chatInputPlaceholder,
    }),
    plansSubscribeCta: normalizePromoText({
      value: value.plansSubscribeCta,
      fallback: DEFAULT_PROMO_CONTENT.plansSubscribeCta,
    }),
    planPopularBadge: normalizePromoText({
      value: value.planPopularBadge,
      fallback: DEFAULT_PROMO_CONTENT.planPopularBadge,
    }),
  };
}

export async function getEffectivePromoContent(): Promise<PromoContent> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({ key: "admin.promoContent" })
      .select("value")
      .lean()) as AppSettingRecord | null;

    return normalizePromoContent(setting?.value);
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return { ...DEFAULT_PROMO_CONTENT };
  }
}
