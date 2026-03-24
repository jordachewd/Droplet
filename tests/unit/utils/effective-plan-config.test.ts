import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLAN_PRICING,
  PERSONA_TRIAL_LIMITS,
  PLAN_LIMITS,
} from "@/constants/plans";
import { SUPPORT_EMAIL } from "@/constants/support";
import {
  getEffectiveCurrencySymbol,
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { createTestUser } from "../test-support";

const { connectToDatabaseMock, findMock, findOneMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findMock: vi.fn(),
  findOneMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: findMock,
    findOne: findOneMock,
  },
}));

type AppSettingRecord = {
  key: string;
  value: unknown;
};

function mockFindSettings(settings: AppSettingRecord[]): void {
  findMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(settings),
    }),
  });
}

function mockFindOneValue(value: unknown): void {
  findOneMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue(
          value === undefined ? null : { key: "setting", value },
        ),
    }),
  });
}

describe("effective-plan-config", () => {
  const liteUser = createTestUser({ plan: { name: "Lite" } });

  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findMock.mockReset();
    findOneMock.mockReset();
  });

  it("normalizes admin settings for pricing, limits, and trial limits", async () => {
    mockFindSettings([
      {
        key: "admin.pricing",
        value: {
          proPrice: 29.9,
          premiumPrice: 59.2,
          currencySymbol: "$",
        },
      },
      {
        key: "admin.currencySymbol",
        value: "$",
      },
      {
        key: "admin.limits",
        value: {
          Lite: {
            conversationsPerDay: 7.8,
            promptsPerConversation: 15.2,
            images: 4,
            audio: -2,
            video: 2,
          },
        },
      },
      {
        key: "admin.trialLimits",
        value: {
          promptsPerConversation: 6.9,
          images: 4,
          audio: 3,
          video: 2,
        },
      },
    ]);

    const config = await getEffectivePlanConfig();

    expect(config.pricing).toEqual({
      Lite: DEFAULT_PLAN_PRICING.Lite,
      Pro: 29,
      Premium: 59,
      currencySymbol: "$",
    });
    expect(config.limits[liteUser.plan.name]).toEqual({
      conversationsPerDay: 7,
      promptsPerConversation: 15,
      images: 4,
      audio: PLAN_LIMITS.Lite.audio,
      video: 2,
    });
    expect(config.trialLimits).toEqual({
      promptsPerConversation: 6,
      images: 4,
      audio: 3,
      video: 2,
    });
  });

  it("supports legacy array pricing format and defaults currency symbol", async () => {
    mockFindSettings([
      {
        key: "admin.pricing",
        value: [
          { name: "Pro", price: 25.4 },
          { name: "Premium", price: 49 },
        ],
      },
    ]);

    const config = await getEffectivePlanConfig();

    expect(config.pricing).toEqual({
      Lite: DEFAULT_PLAN_PRICING.Lite,
      Pro: 25,
      Premium: 49,
      currencySymbol: DEFAULT_PLAN_PRICING.currencySymbol,
    });
    expect(config.limits).toEqual(PLAN_LIMITS);
    expect(config.trialLimits).toEqual(PERSONA_TRIAL_LIMITS);
  });

  it("falls back to defaults when settings are malformed", async () => {
    mockFindSettings([
      { key: "admin.pricing", value: "invalid" },
      { key: "admin.limits", value: null },
      { key: "admin.trialLimits", value: { images: -10 } },
    ]);

    const config = await getEffectivePlanConfig();

    expect(config.pricing).toEqual(DEFAULT_PLAN_PRICING);
    expect(config.limits).toEqual(PLAN_LIMITS);
    expect(config.trialLimits).toEqual(PERSONA_TRIAL_LIMITS);
  });

  it("returns defaults when database access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    const config = await getEffectivePlanConfig();

    expect(config.pricing).toEqual(DEFAULT_PLAN_PRICING);
    expect(config.limits).toEqual(PLAN_LIMITS);
    expect(config.trialLimits).toEqual(PERSONA_TRIAL_LIMITS);
  });

  it("resolves effective currency symbol and falls back on invalid values", async () => {
    mockFindOneValue(" $ ");
    await expect(getEffectiveCurrencySymbol()).resolves.toBe("$");

    mockFindOneValue("invalid");
    await expect(getEffectiveCurrencySymbol()).resolves.toBe("$");
  });

  it("returns default currency symbol on data access failure", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(getEffectiveCurrencySymbol()).resolves.toBe(
      DEFAULT_PLAN_PRICING.currencySymbol,
    );
  });

  it("normalizes support email and falls back when invalid", async () => {
    mockFindOneValue(" Support@Droplet.ai ");
    await expect(getEffectiveSupportEmail()).resolves.toBe(
      "support@droplet.ai",
    );

    mockFindOneValue("invalid-email");
    await expect(getEffectiveSupportEmail()).resolves.toBe(SUPPORT_EMAIL);
  });

  it("returns default support email on data access failure", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(getEffectiveSupportEmail()).resolves.toBe(SUPPORT_EMAIL);
  });
});
