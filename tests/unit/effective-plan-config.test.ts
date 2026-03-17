import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLAN_PRICING,
  PLAN_LIMITS,
  PlanLimits,
} from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: vi.fn(),
  },
}));

function mockSettings(settings: Array<{ key: string; value: unknown }>) {
  const leanMock = vi.fn().mockResolvedValue(settings);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  vi.mocked(AppSetting.find).mockReturnValue({ select: selectMock } as never);
}

describe("getEffectivePlanConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("falls back to defaults when admin settings are missing", async () => {
    mockSettings([]);

    const config = await getEffectivePlanConfig();

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(config.pricing).toEqual(DEFAULT_PLAN_PRICING);
    expect(config.limits).toEqual(PLAN_LIMITS);
  });

  it("uses persisted admin pricing and limits when available", async () => {
    const customLimits: PlanLimits = {
      Lite: {
        conversationsPerDay: 8,
        promptsPerConversation: 16,
        images: 7,
        audio: 6,
        video: 2,
      },
      Pro: {
        conversationsPerDay: 80,
        promptsPerConversation: 160,
        images: 70,
        audio: 65,
        video: 14,
      },
      Premium: {
        conversationsPerDay: -1,
        promptsPerConversation: -1,
        images: -1,
        audio: -1,
        video: 24,
      },
    };

    mockSettings([
      {
        key: "admin.pricing",
        value: {
          proPrice: 23,
          premiumPrice: 47,
        },
      },
      {
        key: "admin.limits",
        value: customLimits,
      },
    ]);

    const config = await getEffectivePlanConfig();

    expect(config.pricing).toEqual({
      Lite: 0,
      Pro: 23,
      Premium: 47,
      currencySymbol: "$",
    });
    expect(config.limits).toEqual(customLimits);
  });

  it("uses persisted currency symbol setting when available", async () => {
    mockSettings([
      {
        key: "admin.currencySymbol",
        value: "€",
      },
    ]);

    const config = await getEffectivePlanConfig();

    expect(config.pricing.currencySymbol).toBe("€");
  });
});
