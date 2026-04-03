import { PlanName } from "@/types/PlanData.d";

export interface PromoContent {
  promoTitlePro: string;
  promoTitlePremium: string;
  promoDescriptionPro: string;
  promoDescriptionPremium: string;
  promoUpgradeCta: string;
  promoAdminLabel: string;
  promoAdminDescription: string;
  promoSuspensionTitle: string;
  promoSuspensionDescription: string;
  promoFreeLabel: string;
  promoCurrentPlanLabel: string;
  promoUpgradeMessage: string;
  promoTrialLabel: string;
  promoPersonaUpgrade: string;
  promoPersonaUpgradeFallback: string;
  promoContactSupportCta: string;
  chatConversationEndedLabel: string;
  chatStartConversationCta: string;
  chatUpgradePlanCta: string;
  chatContactSupportCta: string;
  chatIntroSubheading: string;
  chatInputPlaceholder: string;
  plansSubscribeCta: string;
  planPopularBadge: string;
}

export const DEFAULT_PROMO_CONTENT: PromoContent = {
  promoTitlePro: "Go Pro",
  promoTitlePremium: "Go Premium",
  promoDescriptionPro:
    "Upgrade to Pro for higher usage limits and more persona access.",
  promoDescriptionPremium:
    "Upgrade to Premium for highest limits and premium workflows.",
  promoUpgradeCta: "Upgrade Now",
  promoAdminLabel: "Admin",
  promoAdminDescription: "You have admin access.",
  promoSuspensionTitle: "Account Suspended",
  promoSuspensionDescription:
    "Your account has been suspended. Contact support for assistance.",
  promoFreeLabel: "Free forever",
  promoCurrentPlanLabel: "Your plan",
  promoUpgradeMessage: "Unlock premium features with an upgrade!",
  promoTrialLabel:
    "Trial access with reduced limits. Upgrade to unlock full access.",
  promoPersonaUpgrade: "Upgrade to {plan} to unlock this persona.",
  promoPersonaUpgradeFallback: "Upgrade your plan to unlock this persona.",
  promoContactSupportCta: "Contact support",
  chatConversationEndedLabel: "Conversation Ended",
  chatStartConversationCta: "Start a new conversation",
  chatUpgradePlanCta: "Upgrade your plan",
  chatContactSupportCta: "Contact support",
  chatIntroSubheading: "welcome to your chat dashboard.",
  chatInputPlaceholder: "Ask Droplet...",
  plansSubscribeCta: "Subscribe Now",
  planPopularBadge: "Popular",
};

export function resolvePersonaUpgradeMessage({
  template,
  fallback,
  requiredPlan,
}: {
  template: string;
  fallback: string;
  requiredPlan?: Extract<PlanName, "Pro" | "Premium"> | null;
}): string {
  if (!requiredPlan) {
    return fallback;
  }

  return template.replace("{plan}", requiredPlan);
}
