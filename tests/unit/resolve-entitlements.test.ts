import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/constants/assistant-personas";
import { PLAN_LIMITS } from "@/constants/plans";
import {
  resolveEntitlements,
  resolvePersonaForPlan,
  getRequiredPlanForPersona,
  DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
} from "@/lib/utils/resolve-entitlements";
import { PlanName } from "@/types/PlanData.d";

describe("resolveEntitlements", () => {
  it("returns Lite full + trial persona access and all media entitlements", () => {
    const entitlements = resolveEntitlements("Lite");

    expect(
      entitlements.allowedPersonaIds.filter(
        (personaId) => entitlements.personaAccess![personaId] === "full",
      ),
    ).toEqual(["strategist", "developer"]);
    expect(entitlements.allowedPersonaIds).toContain("teacher");
    expect(entitlements.trialPersonaIds).toContain("teacher");
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(true);
    expect(entitlements.supportsVideoGeneration).toBe(true);
  });

  it("allows selecting limited personas for Lite users", () => {
    const persona = resolvePersonaForPlan({
      personaId: "teacher",
      planName: "Lite",
    });

    expect(persona.id).toBe("teacher");
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
    expect(entitlements.personaAccess!.teacher).toBe("limited");
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

    expect(liteEntitlements.allowedPersonaIds).toHaveLength(6);
    expect(liteEntitlements.trialPersonaIds).toHaveLength(4);
    expect(liteEntitlements.personaAccess!.strategist).toBe("full");
    expect(liteEntitlements.personaAccess!.developer).toBe("full");
    expect(liteEntitlements.personaAccess!.teacher).toBe("limited");
    expect(liteEntitlements.personaAccess!.creator).toBe("limited");
    expect(liteEntitlements.personaAccess!.wellness).toBe("limited");
    expect(liteEntitlements.personaAccess!.interviewer).toBe("limited");

    expect(proEntitlements.allowedPersonaIds).toHaveLength(6);
    expect(proEntitlements.trialPersonaIds).toHaveLength(1);
    expect(proEntitlements.personaAccess!.strategist).toBe("full");
    expect(proEntitlements.personaAccess!.developer).toBe("full");
    expect(proEntitlements.personaAccess!.teacher).toBe("full");
    expect(proEntitlements.personaAccess!.creator).toBe("full");
    expect(proEntitlements.personaAccess!.wellness).toBe("full");
    expect(proEntitlements.personaAccess!.interviewer).toBe("limited");

    expect(premiumEntitlements.allowedPersonaIds).toEqual(
      PERSONAS.map((persona) => persona.id),
    );
    expect(premiumEntitlements.trialPersonaIds).toEqual([]);
    expect(premiumEntitlements.allowedPersonaIds).toHaveLength(6);
    expect(premiumEntitlements.allowedPersonaIds).toContain("interviewer");
    expect(premiumEntitlements.personaAccess!.interviewer).toBe("full");
  });

  it("applies admin full-persona-access overrides per plan", () => {
    const entitlements = resolveEntitlements("Lite", {
      fullPersonaAccessByPlan: {
        Lite: ["strategist", "teacher"],
      },
    });

    expect(entitlements.personaAccess!.strategist).toBe("full");
    expect(entitlements.personaAccess!.teacher).toBe("full");
    expect(entitlements.personaAccess!.developer).toBe("limited");
    expect(entitlements.trialPersonaIds).toContain("developer");
  });
});

describe("getRequiredPlanForPersona", () => {
  it("returns null for Lite-accessible personas", () => {
    expect(
      getRequiredPlanForPersona(
        "strategist",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBeNull();
    expect(
      getRequiredPlanForPersona(
        "developer",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBeNull();
  });

  it("returns Pro for Pro-tier personas", () => {
    expect(
      getRequiredPlanForPersona("teacher", DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN),
    ).toBe("Pro");
    expect(
      getRequiredPlanForPersona("creator", DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN),
    ).toBe("Pro");
    expect(
      getRequiredPlanForPersona(
        "wellness",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBe("Pro");
  });

  it("returns Premium for Premium-only personas", () => {
    expect(
      getRequiredPlanForPersona(
        "interviewer",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBe("Premium");
  });
});
