import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import {
  getEffectivePersonaConfig,
  getPersonaFromConfig,
} from "@/lib/utils/effective-persona-config";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

function mockPersonaOverrides(value: unknown) {
  const leanMock = vi.fn().mockResolvedValue(value ? { value } : null);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  vi.mocked(AppSetting.findOne).mockReturnValue({
    select: selectMock,
  } as never);
}

describe("getEffectivePersonaConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("falls back to default persona content when overrides are missing", async () => {
    mockPersonaOverrides(null);

    const personas = await getEffectivePersonaConfig();
    const strategist = personas.find((persona) => persona.id === "strategist");

    expect(strategist?.label).toBe("Strategist");
    expect(strategist?.starterPrompts.length).toBeGreaterThan(0);
  });

  it("applies admin persona content overrides for supported fields", async () => {
    mockPersonaOverrides({
      strategist: {
        label: "Execution Strategist",
        tagline: "Plan less, ship more.",
        description: "Execution-focused planning and prioritization partner.",
        starterPrompts: ["Plan this sprint", "Review my roadmap"],
      },
    });

    const personas = await getEffectivePersonaConfig();
    const strategist = personas.find((persona) => persona.id === "strategist");

    expect(strategist?.label).toBe("Execution Strategist");
    expect(strategist?.tagline).toBe("Plan less, ship more.");
    expect(strategist?.description).toBe(
      "Execution-focused planning and prioritization partner.",
    );
    expect(strategist?.starterPrompts).toEqual([
      "Plan this sprint",
      "Review my roadmap",
    ]);
    expect(strategist?.heroImage).toBe("/personas/strategist.svg");
  });

  it("ignores invalid override entries and preserves defaults", async () => {
    mockPersonaOverrides({
      strategist: {
        label: "   ",
        starterPrompts: [],
      },
      invalidPersonaId: {
        label: "Should be ignored",
      },
    });

    const personas = await getEffectivePersonaConfig();
    const strategist = personas.find((persona) => persona.id === "strategist");

    expect(strategist?.label).toBe("Strategist");
    expect(strategist?.starterPrompts.length).toBeGreaterThan(0);
    expect(
      personas.find((persona) => persona.label === "Should be ignored"),
    ).toBeUndefined();
  });
});

describe("getPersonaFromConfig", () => {
  it("falls back to strategist when persona id is unknown", async () => {
    mockPersonaOverrides(null);
    const personas = await getEffectivePersonaConfig();

    const persona = getPersonaFromConfig({
      personas,
      personaId: "unknown",
    });

    expect(persona.id).toBe("strategist");
  });
});
