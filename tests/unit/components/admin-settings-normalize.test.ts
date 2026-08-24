import { describe, expect, it } from "vitest";
import {
  normalizePricingSettingsValue,
  normalizeStripePriceIdsSettingsValue,
} from "@/components/admin/settings/normalize-admin-settings";

describe("admin settings normalization", () => {
  const pricingDefaults = {
    proPrice: 19,
    premiumPrice: 39,
    yearlyDiscount: 30,
    currencySymbol: "$" as const,
  };

  const stripePriceIdDefaults = {
    proMonthly: "",
    proYearly: "",
    premiumMonthly: "",
    premiumYearly: "",
  };

  it("normalizes object-based pricing payloads", () => {
    const normalized = normalizePricingSettingsValue(
      {
        proPrice: 25,
        premiumPrice: 49,
        currencySymbol: "€",
      },
      pricingDefaults,
      { yearlyDiscount: 40 },
    );

    expect(normalized).toEqual({
      proPrice: 25,
      premiumPrice: 49,
      yearlyDiscount: 40,
      currencySymbol: "€",
    });
  });

  it("normalizes array-based legacy pricing payloads", () => {
    const normalized = normalizePricingSettingsValue(
      [
        { name: "Lite", price: 0 },
        { name: "Pro", price: 22 },
        { name: "Premium", price: 55 },
      ],
      pricingDefaults,
      { yearlyDiscount: 15 },
    );

    expect(normalized).toEqual({
      proPrice: 22,
      premiumPrice: 55,
      yearlyDiscount: 15,
      currencySymbol: "$",
    });
  });

  it("clamps yearly discount to 0-100 during normalization", () => {
    const normalized = normalizePricingSettingsValue({}, pricingDefaults, {
      yearlyDiscount: 170,
    });

    expect(normalized.yearlyDiscount).toBe(100);
  });

  it("falls back to defaults for invalid pricing payloads", () => {
    const normalized = normalizePricingSettingsValue(
      "invalid",
      pricingDefaults,
      "invalid-discount",
    );

    expect(normalized).toEqual(pricingDefaults);
  });

  it("normalizes stripe price ids from settings object", () => {
    const normalized = normalizeStripePriceIdsSettingsValue(
      {
        proMonthly: " price_pro_monthly ",
        proYearly: "price_pro_yearly",
        premiumMonthly: "price_premium_monthly",
        premiumYearly: "price_premium_yearly",
      },
      stripePriceIdDefaults,
    );

    expect(normalized).toEqual({
      proMonthly: "price_pro_monthly",
      proYearly: "price_pro_yearly",
      premiumMonthly: "price_premium_monthly",
      premiumYearly: "price_premium_yearly",
    });
  });

  it("falls back to defaults for missing stripe price ids payload", () => {
    const normalized = normalizeStripePriceIdsSettingsValue(
      null,
      stripePriceIdDefaults,
    );

    expect(normalized).toEqual(stripePriceIdDefaults);
  });
});
