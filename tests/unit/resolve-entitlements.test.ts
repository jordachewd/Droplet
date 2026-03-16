import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import { PLAN_LIMITS } from "@/constants/plans";
import {
  resolveEntitlements,
  resolvePersonaForPlan,
} from "@/lib/utils/resolve-entitlements";
import { PlanName } from "@/types/PlanData.d";

describe("resolveEntitlements", () => {
  it("returns Lite full + trial persona access and all media entitlements", () => {
    const entitlements = resolveEntitlements("Lite");

    expect(
      entitlements.allowedPersonaIds.filter(
        (personaId) => entitlements.personaAccess![personaId] === "full",
      ),
    ).toEqual(["strategist", "developer", "best-friend"]);
    expect(entitlements.allowedPersonaIds).toContain("girlfriend");
    expect(entitlements.trialPersonaIds).toContain("girlfriend");
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(true);
    expect(entitlements.supportsVideoGeneration).toBe(true);
  });

  it("allows selecting limited personas for Lite users", () => {
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
    expect(entitlements.personaAccess!.strategist).toBe("full");
    expect(entitlements.personaAccess!.girlfriend).toBe("limited");
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

    expect(liteEntitlements.allowedPersonaIds).toHaveLength(10);
    expect(liteEntitlements.trialPersonaIds).toHaveLength(7);
    expect(liteEntitlements.personaAccess!.strategist).toBe("full");
    expect(liteEntitlements.personaAccess!.developer).toBe("full");
    expect(liteEntitlements.personaAccess!["best-friend"]).toBe("full");
    expect(liteEntitlements.personaAccess!.teacher).toBe("limited");

    expect(proEntitlements.allowedPersonaIds).toHaveLength(10);
    expect(proEntitlements.trialPersonaIds).toHaveLength(3);
    expect(proEntitlements.personaAccess!.interviewer).toBe("limited");
    expect(proEntitlements.personaAccess!.creator).toBe("limited");
    expect(proEntitlements.personaAccess!.analyst).toBe("limited");

    expect(premiumEntitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
    expect(premiumEntitlements.trialPersonaIds).toEqual([]);
    expect(premiumEntitlements.allowedPersonaIds).toHaveLength(10);
    expect(premiumEntitlements.allowedPersonaIds).toContain("interviewer");
    expect(premiumEntitlements.personaAccess!.interviewer).toBe("full");
  });
});
