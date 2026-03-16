import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import { PLAN_LIMITS } from "@/constants/plans";
import {
  resolveEntitlements,
  resolvePersonaForPlan,
} from "@/lib/utils/resolve-entitlements";
import { PlanName } from "@/types/PlanData.d";

describe("resolveEntitlements", () => {
  it("returns Lite plan-gated personas and all media entitlements", () => {
    const entitlements = resolveEntitlements("Lite");

    expect(entitlements.allowedPersonaIds).toEqual([
      "strategist",
      "developer",
      "best-friend",
    ]);
    expect(entitlements.allowedPersonaIds).not.toContain("girlfriend");
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(true);
    expect(entitlements.supportsVideoGeneration).toBe(true);
  });

  it("falls back to the first allowed persona when Lite users select a blocked persona", () => {
    const persona = resolvePersonaForPlan({
      personaId: "girlfriend",
      planName: "Lite",
    });

    expect(persona.id).toBe("strategist");
  });

  it("covers plan x media capability combinations for image, audio, and video", () => {
    const plans: PlanName[] = ["Lite", "Pro", "Premium"];

    for (const planName of plans) {
      const entitlements = resolveEntitlements(planName);
      const limits = PLAN_LIMITS[planName];

      expect(entitlements.supportsImageGeneration).toBe(limits.images !== 0);
      expect(entitlements.supportsAudioGeneration).toBe(limits.audio !== 0);
      expect(entitlements.supportsVideoGeneration).toBe(limits.video !== 0);
    }
  });

  it("reverts expired paid plans to Lite entitlements when expiresOn is in the past", () => {
    const entitlements = resolveEntitlements("Pro", {
      expiresOn: "2026-01-01T00:00:00.000Z",
      now: new Date("2026-03-13T00:00:00.000Z"),
    });

    expect(entitlements.planName).toBe("Lite");
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(true);
    expect(entitlements.supportsVideoGeneration).toBe(true);
    expect(entitlements.allowedPersonaIds).toEqual([
      "strategist",
      "developer",
      "best-friend",
    ]);
  });

  it("blocks entitlements for suspended users", () => {
    const entitlements = resolveEntitlements("Premium", {
      isSuspended: true,
    });

    expect(entitlements.allowedPersonaIds).toEqual([]);
    expect(entitlements.supportsImageGeneration).toBe(false);
    expect(entitlements.supportsAudioGeneration).toBe(false);
    expect(entitlements.supportsVideoGeneration).toBe(false);
    expect(entitlements.imageLimitReached).toBe(true);
    expect(entitlements.audioLimitReached).toBe(true);
    expect(entitlements.videoLimitReached).toBe(true);
  });

  it("enforces the approved persona access matrix per plan", () => {
    const liteEntitlements = resolveEntitlements("Lite");
    const proEntitlements = resolveEntitlements("Pro");
    const premiumEntitlements = resolveEntitlements("Premium");

    expect(liteEntitlements.allowedPersonaIds).toEqual([
      "strategist",
      "developer",
      "best-friend",
    ]);
    expect(liteEntitlements.allowedPersonaIds).toHaveLength(3);

    expect(proEntitlements.allowedPersonaIds).toEqual([
      "strategist",
      "developer",
      "best-friend",
      "teacher",
      "wellness",
      "boyfriend",
      "girlfriend",
    ]);
    expect(proEntitlements.allowedPersonaIds).toHaveLength(7);
    expect(proEntitlements.allowedPersonaIds).not.toContain("interviewer");
    expect(proEntitlements.allowedPersonaIds).not.toContain("creator");
    expect(proEntitlements.allowedPersonaIds).not.toContain("analyst");

    expect(premiumEntitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
    expect(premiumEntitlements.allowedPersonaIds).toHaveLength(10);
    expect(premiumEntitlements.allowedPersonaIds).toContain("interviewer");
  });
});
