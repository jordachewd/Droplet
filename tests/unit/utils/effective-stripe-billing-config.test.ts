import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectToDatabaseMock,
  appSettingFindMock,
  getCachedConfigValueMock,
  stderrWriteMock,
} = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  appSettingFindMock: vi.fn(),
  getCachedConfigValueMock: vi.fn(),
  stderrWriteMock: vi.fn(() => true),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: appSettingFindMock,
  },
}));

vi.mock("@/lib/utils/config-cache", () => ({
  getCachedConfigValue: getCachedConfigValueMock,
}));

import {
  DEFAULT_STRIPE_PRICE_IDS,
  DEFAULT_YEARLY_DISCOUNT,
  getEffectiveStripeBillingConfig,
  resolveExpectedCheckoutAmount,
  resolveStripePriceId,
} from "@/lib/utils/effective-stripe-billing-config";

function buildFindQuery(result: unknown) {
  return {
    select: vi.fn(() => ({
      lean: vi.fn(async () => result),
    })),
  };
}

describe("effective-stripe-billing-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(stderrWriteMock);

    connectToDatabaseMock.mockResolvedValue(undefined);
    getCachedConfigValueMock.mockImplementation(
      async (params: { resolver: () => Promise<unknown> }) => params.resolver(),
    );
    appSettingFindMock.mockReturnValue(buildFindQuery([]));
  });

  it("returns null price for Lite plan checkout", () => {
    expect(
      resolveStripePriceId({
        planName: "Lite",
        billing: "Monthly",
        stripePriceIds: {
          proMonthly: "price_pro_monthly",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
      }),
    ).toBeNull();
  });

  it("resolves Pro monthly Stripe price id", () => {
    expect(
      resolveStripePriceId({
        planName: "Pro",
        billing: "Monthly",
        stripePriceIds: {
          proMonthly: "price_pro_monthly",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
      }),
    ).toBe("price_pro_monthly");
  });

  it("resolves Pro yearly Stripe price id", () => {
    expect(
      resolveStripePriceId({
        planName: "Pro",
        billing: "Yearly",
        stripePriceIds: {
          proMonthly: "price_pro_monthly",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
      }),
    ).toBe("price_pro_yearly");
  });

  it("resolves Premium monthly Stripe price id", () => {
    expect(
      resolveStripePriceId({
        planName: "Premium",
        billing: "Monthly",
        stripePriceIds: {
          proMonthly: "price_pro_monthly",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
      }),
    ).toBe("price_premium_monthly");
  });

  it("resolves Premium yearly Stripe price id", () => {
    expect(
      resolveStripePriceId({
        planName: "Premium",
        billing: "Yearly",
        stripePriceIds: {
          proMonthly: "price_pro_monthly",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
      }),
    ).toBe("price_premium_yearly");
  });

  it("returns zero expected amount for Lite plan", () => {
    expect(
      resolveExpectedCheckoutAmount({
        planName: "Lite",
        billing: "Monthly",
        pricing: {
          Lite: 0,
          Pro: 19,
          Premium: 39,
          currencySymbol: "$",
        },
        yearlyDiscount: 30,
      }),
    ).toBe(0);
  });

  it("returns monthly expected checkout amount for paid plans", () => {
    expect(
      resolveExpectedCheckoutAmount({
        planName: "Pro",
        billing: "Monthly",
        pricing: {
          Lite: 0,
          Pro: 19,
          Premium: 39,
          currencySymbol: "$",
        },
        yearlyDiscount: 30,
      }),
    ).toBe(19);
  });

  it("returns discounted yearly checkout amount for Pro", () => {
    expect(
      resolveExpectedCheckoutAmount({
        planName: "Pro",
        billing: "Yearly",
        pricing: {
          Lite: 0,
          Pro: 19,
          Premium: 39,
          currencySymbol: "$",
        },
        yearlyDiscount: 30,
      }),
    ).toBe(159.6);
  });

  it("rounds yearly expected checkout amount to two decimals", () => {
    expect(
      resolveExpectedCheckoutAmount({
        planName: "Premium",
        billing: "Yearly",
        pricing: {
          Lite: 0,
          Pro: 19,
          Premium: 39.99,
          currencySymbol: "$",
        },
        yearlyDiscount: 15,
      }),
    ).toBe(407.9);
  });

  it("loads and normalizes stripe billing settings from AppSetting records", async () => {
    appSettingFindMock.mockReturnValue(
      buildFindQuery([
        {
          key: "admin.stripePriceIds",
          value: {
            proMonthly: " price_pro_monthly ",
            proYearly: "price_pro_yearly",
            premiumMonthly: "price_premium_monthly",
            premiumYearly: "price_premium_yearly",
          },
        },
        {
          key: "admin.yearlyDiscount",
          value: {
            yearlyDiscount: "35",
          },
        },
      ]),
    );

    const config = await getEffectiveStripeBillingConfig();

    expect(appSettingFindMock).toHaveBeenCalledWith({
      key: { $in: ["admin.stripePriceIds", "admin.yearlyDiscount"] },
    });
    expect(config).toEqual({
      stripePriceIds: {
        proMonthly: "price_pro_monthly",
        proYearly: "price_pro_yearly",
        premiumMonthly: "price_premium_monthly",
        premiumYearly: "price_premium_yearly",
      },
      yearlyDiscount: 35,
    });
  });

  it("falls back to defaults when settings payload is malformed", async () => {
    appSettingFindMock.mockReturnValue(
      buildFindQuery([
        {
          key: "admin.stripePriceIds",
          value: "not-an-object",
        },
        {
          key: "admin.yearlyDiscount",
          value: {
            yearlyDiscount: -20,
          },
        },
      ]),
    );

    const config = await getEffectiveStripeBillingConfig();

    expect(config).toEqual({
      stripePriceIds: { ...DEFAULT_STRIPE_PRICE_IDS },
      yearlyDiscount: DEFAULT_YEARLY_DISCOUNT,
    });
  });

  it("falls back to defaults when resolver throws", async () => {
    connectToDatabaseMock.mockRejectedValue(new Error("db unavailable"));

    const config = await getEffectiveStripeBillingConfig();

    expect(config).toEqual({
      stripePriceIds: { ...DEFAULT_STRIPE_PRICE_IDS },
      yearlyDiscount: DEFAULT_YEARLY_DISCOUNT,
    });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining("resolver fallback to defaults"),
    );
  });
});
