import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import { PLAN_LIMITS } from "@/constants/plans";
import {
  resolveEntitlements,
  resolvePersonaForPlan,
} from "@/lib/utils/resolve-entitlements";
import { PlanName } from "@/types/PlanData.d";

describe("resolveEntitlements", () => {
  it("allows all personas and blocks audio generation for Lite", () => {
    const entitlements = resolveEntitlements("Lite");

    expect(entitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
    expect(entitlements.allowedPersonaIds).toContain("boyfriend");
    expect(entitlements.allowedPersonaIds).toContain("girlfriend");
    expect(entitlements.supportsAudioGeneration).toBe(false);
  });

  it("preserves companion persona selections for Lite users", () => {
    const persona = resolvePersonaForPlan({
      personaId: "girlfriend",
      planName: "Lite",
    });

    expect(persona.id).toBe("girlfriend");
  });

  it("covers plan x media capability combinations for image, audio, and video", () => {
    const plans: PlanName[] = ["Lite", "Pro", "Premium"];

    for (const planName of plans) {
      const entitlements = resolveEntitlements(planName);
      const limits = PLAN_LIMITS[planName];

      expect(entitlements.supportsImageGeneration).toBe(limits.images !== 0);
      expect(entitlements.supportsAudioGeneration).toBe(limits.audio !== 0);

      // Video entitlement is represented by plan limits in current architecture.
      expect(limits.video).toBe(planName === "Premium" ? 10 : 0);
    }
  });

  it("reverts expired paid plans to Lite entitlements when expiresOn is in the past", () => {
    const entitlements = resolveEntitlements("Pro", {
      expiresOn: "2026-01-01T00:00:00.000Z",
      now: new Date("2026-03-13T00:00:00.000Z"),
    });

    expect(entitlements.planName).toBe("Lite");
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(false);
    expect(entitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
  });

  it("blocks entitlements for suspended users", () => {
    const entitlements = resolveEntitlements("Premium", {
      isSuspended: true,
    });

    expect(entitlements.allowedPersonaIds).toEqual([]);
    expect(entitlements.supportsImageGeneration).toBe(false);
    expect(entitlements.supportsAudioGeneration).toBe(false);
    expect(entitlements.imageLimitReached).toBe(true);
    expect(entitlements.audioLimitReached).toBe(true);
  });

  it("keeps all 9 personas accessible across all plans", () => {
    const expectedPersonaIds = PERSONAS.map((persona) => persona.id);

    for (const planName of ["Lite", "Pro", "Premium"] as const) {
      const entitlements = resolveEntitlements(planName);

      expect(entitlements.allowedPersonaIds).toEqual(expectedPersonaIds);
      expect(entitlements.allowedPersonaIds).toHaveLength(9);
    }
  });
});
