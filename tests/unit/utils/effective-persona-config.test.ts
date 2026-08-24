import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERSONA_ID,
  PERSONAS,
  getPersona,
} from "@/constants/assistant-personas";
import {
  getEffectivePersonaConfig,
  getPersonaFromConfig,
} from "@/lib/utils/effective-persona-config";
import { createTestUser } from "../test-support";

const { connectToDatabaseMock, findOneMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findOneMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOne: findOneMock,
  },
}));

function mockPersonaOverrideValue(value: unknown): void {
  findOneMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue(
          value === undefined ? null : ({ value } satisfies { value: unknown }),
        ),
    }),
  });
}

describe("effective-persona-config", () => {
  const user = createTestUser({ plan: { name: "Pro" } });

  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneMock.mockReset();
  });

  it("applies valid admin overrides and normalizes invalid fields", async () => {
    const strategistDefault = getPersona("strategist");

    mockPersonaOverrideValue({
      strategist: {
        label: " Strategic Guide ",
        tagline: " ",
        description: " Revised strategist description ",
        starterPrompts: ["  Prompt one  ", "", "Prompt two", 123],
      },
      invalidPersona: {
        label: "Ignored",
      },
    });

    const personas = await getEffectivePersonaConfig();
    const strategist = personas.find((persona) => persona.id === "strategist");
    const teacher = personas.find((persona) => persona.id === "teacher");

    expect(strategist).toBeDefined();
    expect(strategist?.label).toBe("Strategic Guide");
    expect(strategist?.tagline).toBe(strategistDefault.tagline);
    expect(strategist?.description).toBe("Revised strategist description");
    expect(strategist?.starterPrompts).toEqual(["Prompt one", "Prompt two"]);
    expect(teacher?.label).toBe(getPersona("teacher").label);
    expect(personas).toHaveLength(PERSONAS.length);
    expect(user.plan.name).toBe("Pro");
  });

  it("returns cloned defaults when no overrides exist", async () => {
    mockPersonaOverrideValue(undefined);

    const personas = await getEffectivePersonaConfig();

    expect(personas).toEqual(PERSONAS);
    expect(personas[0]).not.toBe(PERSONAS[0]);
    expect(personas[0].starterPrompts).not.toBe(PERSONAS[0].starterPrompts);
  });

  it("returns cloned defaults when data access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    const personas = await getEffectivePersonaConfig();

    expect(personas).toEqual(PERSONAS);
    personas[0].starterPrompts.push("New prompt");
    expect(PERSONAS[0].starterPrompts).not.toContain("New prompt");
  });

  it("resolves default persona when personaId is missing", () => {
    const persona = getPersonaFromConfig({
      personas: PERSONAS,
      personaId: null,
    });

    expect(persona.id).toBe(DEFAULT_PERSONA_ID);
  });

  it("resolves requested persona when it exists in config", () => {
    const persona = getPersonaFromConfig({
      personas: PERSONAS,
      personaId: "teacher",
    });

    expect(persona.id).toBe("teacher");
  });

  it("falls back safely when requested persona is unavailable", () => {
    const personasWithoutDefault = PERSONAS.filter(
      (persona) => persona.id !== DEFAULT_PERSONA_ID,
    );

    const persona = getPersonaFromConfig({
      personas: personasWithoutDefault,
      personaId: DEFAULT_PERSONA_ID,
    });

    expect(persona.id).toBe(DEFAULT_PERSONA_ID);
    expect(persona).toEqual(PERSONAS[0]);
  });
});
