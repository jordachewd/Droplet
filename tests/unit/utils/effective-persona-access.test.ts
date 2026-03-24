import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import {
  getEffectivePersonaAccessByPlan,
  type FullPersonaAccessByPlan,
} from "@/lib/utils/effective-persona-access";
import { DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN } from "@/lib/utils/resolve-entitlements";
import { createTestUser } from "../test-support";

const { connectToDatabaseMock, findMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: findMock,
  },
}));

type AppSettingRecord = {
  key: string;
  value: unknown;
};

function mockSettings(settings: AppSettingRecord[]): void {
  findMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(settings),
    }),
  });
}

describe("effective-persona-access", () => {
  const liteUser = createTestUser({ plan: { name: "Lite" } });

  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findMock.mockReset();
  });

  it("normalizes plan persona access arrays and filters invalid entries", async () => {
    mockSettings([
      {
        key: "persona_access_lite",
        value: ["strategist", "invalid", 123],
      },
      {
        key: "persona_access_pro",
        value: { not: "an array" },
      },
      {
        key: "persona_access_premium",
        value: ["interviewer", "creator"],
      },
    ]);

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(accessByPlan[liteUser.plan.name]).toEqual(["strategist"]);
    expect(accessByPlan.Pro).toEqual(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro);
    expect(accessByPlan.Premium).toEqual(["interviewer", "creator"]);
    expect(
      accessByPlan.Premium.every((id) => PERSONAS.some((p) => p.id === id)),
    ).toBe(true);
  });

  it("returns cloned defaults when data access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    const accessByPlan = await getEffectivePersonaAccessByPlan();

    expect(accessByPlan).toEqual(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN);

    accessByPlan.Lite.push("teacher");
    expect(accessByPlan.Lite).not.toEqual(
      DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite,
    );
    expect(DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite).toEqual([
      "strategist",
      "developer",
    ]);
  });

  it("falls back to defaults when no persona settings exist", async () => {
    mockSettings([]);

    const accessByPlan = await getEffectivePersonaAccessByPlan();
    const expected: FullPersonaAccessByPlan = {
      Lite: DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite,
      Pro: DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro,
      Premium: DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium,
    };

    expect(accessByPlan).toEqual(expected);
  });
});
