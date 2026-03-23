import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import {
  getEffectivePersonaAccessByPlan,
  type FullPersonaAccessByPlan,
} from "@/lib/utils/effective-persona-access";
import { DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN } from "@/lib/utils/resolve-entitlements";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: vi.fn(),
  },
}));

function mockPersonaAccessSettings(
  settings: Array<{ key: string; value: unknown }>,
) {
  const leanMock = vi.fn().mockResolvedValue(settings);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  vi.mocked(AppSetting.find).mockReturnValue({ select: selectMock } as never);
}

describe("getEffectivePersonaAccessByPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("falls back to default persona access when no settings are stored", async () => {
    mockPersonaAccessSettings([]);

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(AppSetting.find).toHaveBeenCalledWith({
      key: {
        $in: [
          "persona_access_lite",
          "persona_access_pro",
          "persona_access_premium",
        ],
      },
    });
    expect(accessByPlan).toEqual(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN);
  });

  it("applies stored arrays and filters invalid persona ids", async () => {
    mockPersonaAccessSettings([
      {
        key: "persona_access_lite",
        value: ["strategist", "teacher", 7, "not-a-persona"],
      },
      {
        key: "persona_access_pro",
        value: "invalid_non_array_value",
      },
      {
        key: "persona_access_premium",
        value: ["interviewer", "creator", null, "ghost"],
      },
    ]);

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(accessByPlan).toEqual<FullPersonaAccessByPlan>({
      Lite: ["strategist", "teacher"],
      Pro: DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro,
      Premium: ["interviewer", "creator"],
    });
  });

  it("preserves an explicitly empty configured persona array", async () => {
    mockPersonaAccessSettings([
      {
        key: "persona_access_lite",
        value: [],
      },
    ]);

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(accessByPlan.Lite).toEqual([]);
    expect(accessByPlan.Pro).toEqual(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro);
    expect(accessByPlan.Premium).toEqual(
      DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium,
    );
  });

  it("returns cloned defaults when database calls fail", async () => {
    vi.mocked(connectToDatabase).mockRejectedValueOnce(
      new Error("querySrv ECONNREFUSED"),
    );

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(accessByPlan).toEqual(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN);
    expect(accessByPlan.Lite).not.toBe(
      DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite,
    );
    expect(accessByPlan.Pro).not.toBe(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro);
    expect(accessByPlan.Premium).not.toBe(
      DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium,
    );
  });
});
