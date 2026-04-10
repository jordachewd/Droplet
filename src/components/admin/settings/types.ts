import type { PersonaTrialLimits, PlanLimits } from "@/constants/plans";
import type { PromoContent } from "@/constants/promo-content";
import { HomepageCopy } from "@/constants/homepage-copy";
import { AboutContent } from "@/constants/about-data";
import type { FaqItem } from "@/constants/faqs";
import { HeroContent } from "@/constants/hero-content";
import { LandingContent } from "@/constants/landing-data";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndedReason } from "@/types/TaskData.d";

export interface PricingSettingsFormValue {
  proPrice: number;
  premiumPrice: number;
  yearlyDiscount: number;
  currencySymbol: "$" | "€";
}

export interface ThemeSettingsFormValue {
  defaultMode: "light" | "dark";
}

export interface SupportSettingsFormValue {
  supportEmail: string;
}

export type StopReasonMessagesSettingsFormValue = Record<
  TaskEndedReason,
  string
>;

export type LimitsSettingsFormValue = PlanLimits;
export type TrialLimitsSettingsFormValue = PersonaTrialLimits;

export type PersonaAccessSettingsFormValue = Record<
  "Lite" | "Pro" | "Premium",
  PersonaId[]
>;

export type PersonaContentSettingsFormValue = Record<
  PersonaId,
  {
    label: string;
    tagline: string;
    description: string;
    starterPrompts: string[];
  }
>;

export type FaqContentSettingsFormValue = FaqItem[];

export type HeroContentSettingsFormValue = HeroContent;

export type LandingContentSettingsFormValue = LandingContent;
export type HomepageCopySettingsFormValue = HomepageCopy;
export type HomepageFeaturedPersonasSettingsFormValue = PersonaId[];

export type AboutContentSettingsFormValue = AboutContent;
export type PromoContentSettingsFormValue = PromoContent;

export const PERSONA_ACCESS_KEY_BY_PLAN = {
  Lite: "persona_access_lite",
  Pro: "persona_access_pro",
  Premium: "persona_access_premium",
} as const;
