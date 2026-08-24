import "server-only";

import type { PlanPricing } from "@/constants/plans";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getCachedConfigValue } from "@/lib/utils/config-cache";
import { isObjectRecord } from "@/lib/utils/type-guards";
import type { BillingCycle, PlanName } from "@/types/PlanData.d";

type AppSettingRecord = {
  key: string;
  value: unknown;
};

export type StripePriceIds = {
  proMonthly: string;
  proYearly: string;
  premiumMonthly: string;
  premiumYearly: string;
};

export const DEFAULT_YEARLY_DISCOUNT = 30;
export const DEFAULT_STRIPE_PRICE_IDS: StripePriceIds = {
  proMonthly: "",
  proYearly: "",
  premiumMonthly: "",
  premiumYearly: "",
};

export interface EffectiveStripeBillingConfig {
  stripePriceIds: StripePriceIds;
  yearlyDiscount: number;
}

function normalizeStripePriceId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStripePriceIds(value: unknown): StripePriceIds {
  if (!isObjectRecord(value)) {
    return { ...DEFAULT_STRIPE_PRICE_IDS };
  }

  return {
    proMonthly: normalizeStripePriceId(value.proMonthly),
    proYearly: normalizeStripePriceId(value.proYearly),
    premiumMonthly: normalizeStripePriceId(value.premiumMonthly),
    premiumYearly: normalizeStripePriceId(value.premiumYearly),
  };
}

function normalizeYearlyDiscount(value: unknown): number {
  const rawValue =
    isObjectRecord(value) && "yearlyDiscount" in value
      ? value.yearlyDiscount
      : value;

  const parsedValue =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
        ? Number(rawValue)
        : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return DEFAULT_YEARLY_DISCOUNT;
  }

  return Math.min(100, parsedValue);
}

export function resolveStripePriceId({
  planName,
  billing,
  stripePriceIds,
}: {
  planName: PlanName;
  billing: BillingCycle;
  stripePriceIds: StripePriceIds;
}): string | null {
  if (planName === "Lite") {
    return null;
  }

  if (planName === "Pro") {
    return billing === "Yearly"
      ? stripePriceIds.proYearly
      : stripePriceIds.proMonthly;
  }

  return billing === "Yearly"
    ? stripePriceIds.premiumYearly
    : stripePriceIds.premiumMonthly;
}

export function resolveExpectedCheckoutAmount({
  planName,
  billing,
  pricing,
  yearlyDiscount,
}: {
  planName: PlanName;
  billing: BillingCycle;
  pricing: PlanPricing;
  yearlyDiscount: number;
}): number {
  if (planName === "Lite") {
    return 0;
  }

  const monthlyPrice = pricing[planName];

  if (billing === "Monthly") {
    return monthlyPrice;
  }

  const yearlyMultiplier = (100 - yearlyDiscount) / 100;
  return Number((monthlyPrice * 12 * yearlyMultiplier).toFixed(2));
}

export async function getEffectiveStripeBillingConfig(): Promise<EffectiveStripeBillingConfig> {
  return getCachedConfigValue({
    key: "effective-stripe-billing-config",
    resolver: async () => {
      try {
        await connectToDatabase();

        const settings = (await AppSetting.find({
          key: { $in: ["admin.stripePriceIds", "admin.yearlyDiscount"] },
        })
          .select("key value")
          .lean()) as AppSettingRecord[];
        const settingsByKey = new Map(
          settings.map((setting) => [setting.key, setting.value]),
        );

        return {
          stripePriceIds: normalizeStripePriceIds(
            settingsByKey.get("admin.stripePriceIds"),
          ),
          yearlyDiscount: normalizeYearlyDiscount(
            settingsByKey.get("admin.yearlyDiscount"),
          ),
        };
      } catch (error) {
        process.stderr.write(
          `[effective-stripe-billing-config] resolver fallback to defaults: ${
            error instanceof Error ? error.message : "unknown"
          }\n`,
        );

        return {
          stripePriceIds: { ...DEFAULT_STRIPE_PRICE_IDS },
          yearlyDiscount: DEFAULT_YEARLY_DISCOUNT,
        };
      }
    },
  });
}
