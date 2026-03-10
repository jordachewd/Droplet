import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import {
  resolveEntitlements,
  resolvePersonaForPlan,
} from "@/lib/utils/resolve-entitlements";

describe("resolveEntitlements", () => {
  it("allows all personas and audio generation for Lite", () => {
    const entitlements = resolveEntitlements("Lite");

    expect(entitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
    expect(entitlements.allowedPersonaIds).toContain("boyfriend");
    expect(entitlements.allowedPersonaIds).toContain("girlfriend");
    expect(entitlements.supportsAudioGeneration).toBe(true);
  });

  it("preserves companion persona selections for Lite users", () => {
    const persona = resolvePersonaForPlan({
      personaId: "girlfriend",
      planName: "Lite",
    });

    expect(persona.id).toBe("girlfriend");
  });
});
