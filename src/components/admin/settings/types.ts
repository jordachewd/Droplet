import { PersonaTrialLimits, PlanLimits } from "@/constants/plans";
import { PersonaId } from "@/types/PersonaData.d";

export interface PricingSettingsFormValue {
  proPrice: number;
  premiumPrice: number;
  currencySymbol: "$" | "€";
}

export interface ThemeSettingsFormValue {
  defaultMode: "light" | "dark";
}

export interface SupportSettingsFormValue {
  supportEmail: string;
}

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

export const PERSONA_ACCESS_KEY_BY_PLAN = {
  Lite: "persona_access_lite",
  Pro: "persona_access_pro",
  Premium: "persona_access_premium",
} as const;
