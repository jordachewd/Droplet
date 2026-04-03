import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, type PlanLimits } from "@/constants/plans";
import { PERSONAS } from "@/constants/assistant-personas";
import {
  DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
  getRequiredPlanForPersona,
  resolveEntitlements,
  resolvePersonaForPlan,
} from "@/lib/utils/resolve-entitlements";
import { createTestUser } from "../test-support";

describe("resolve-entitlements", () => {
  it("returns required upgrade plan by persona access map", () => {
    expect(
      getRequiredPlanForPersona(
        "strategist",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBeNull();
    expect(
      getRequiredPlanForPersona("teacher", DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN),
    ).toBe("Pro");
    expect(
      getRequiredPlanForPersona(
        "interviewer",
        DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN,
      ),
    ).toBe("Premium");
  });

  it("resolves lite defaults with full and limited persona access", () => {
    const liteUser = createTestUser({ plan: { name: "Lite" } });
    const entitlements = resolveEntitlements(liteUser.plan.name);

    expect(entitlements.planName).toBe("Lite");
    expect(entitlements.limits).toEqual(PLAN_LIMITS.Lite);
    expect(entitlements.supportsImageGeneration).toBe(true);
    expect(entitlements.supportsAudioGeneration).toBe(true);
    expect(entitlements.allowedPersonaIds).toHaveLength(PERSONAS.length);
    expect(entitlements.trialPersonaIds).toEqual([
      "teacher",
      "creator",
      "wellness",
      "interviewer",
    ]);
    expect(entitlements.personaAccess?.strategist).toBe("full");
    expect(entitlements.personaAccess?.teacher).toBe("limited");
  });

  it("blocks all personas and media when user is suspended", () => {
    const proUser = createTestUser({ plan: { name: "Pro" } });
    const entitlements = resolveEntitlements(proUser.plan.name, {
      isSuspended: true,
    });

    expect(entitlements.planName).toBe("Pro");
    expect(entitlements.allowedPersonaIds).toEqual([]);
    expect(entitlements.trialPersonaIds).toEqual([]);
    expect(entitlements.supportsImageGeneration).toBe(false);
    expect(entitlements.supportsAudioGeneration).toBe(false);
    expect(entitlements.imageLimitReached).toBe(true);
    expect(entitlements.audioLimitReached).toBe(true);
    expect(
      Object.values(entitlements.personaAccess ?? {}).every(
        (accessLevel) => accessLevel === "blocked",
      ),
    ).toBe(true);
  });

  it("applies unlimited admin entitlements", () => {
    const adminUser = createTestUser({ role: "admin", plan: { name: "Lite" } });
    const entitlements = resolveEntitlements(adminUser.plan.name, {
      isAdmin: true,
    });

    expect(entitlements.planName).toBe("Lite");
    expect(entitlements.limits).toEqual({
      conversationsPerDay: -1,
      promptsPerConversation: -1,
      images: -1,
      audio: -1,
    });
    expect(entitlements.allowedPersonaIds).toHaveLength(PERSONAS.length);
    expect(entitlements.trialPersonaIds).toEqual([]);
    expect(
      Object.values(entitlements.personaAccess ?? {}).every(
        (accessLevel) => accessLevel === "full",
      ),
    ).toBe(true);
  });

  it("falls back to lite entitlements when paid plan is expired", () => {
    const paidUser = createTestUser({ plan: { name: "Premium" } });
    const entitlements = resolveEntitlements(paidUser.plan.name, {
      expiresOn: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-03-24T12:00:00.000Z"),
    });

    expect(entitlements.planName).toBe("Lite");
    expect(entitlements.limits).toEqual(PLAN_LIMITS.Lite);
    expect(entitlements.personaAccess?.strategist).toBe("full");
    expect(entitlements.personaAccess?.teacher).toBe("limited");
  });

  it("supports custom plan limits and custom full persona mapping", () => {
    const customPlanLimits: PlanLimits = {
      Lite: {
        conversationsPerDay: 7,
        promptsPerConversation: 15,
        images: 4,
        audio: 5,
      },
      Pro: PLAN_LIMITS.Pro,
      Premium: PLAN_LIMITS.Premium,
    };
    const entitlements = resolveEntitlements("Lite", {
      planLimits: customPlanLimits,
      fullPersonaAccessByPlan: {
        Lite: ["teacher"],
      },
    });

    expect(entitlements.limits).toEqual(customPlanLimits.Lite);
    expect(entitlements.personaAccess?.teacher).toBe("full");
    expect(entitlements.personaAccess?.strategist).toBe("limited");
    expect(entitlements.trialPersonaIds).toContain("strategist");
  });

  it("resolves persona from plan-aware access and defaults safely", () => {
    const liteUser = createTestUser({ plan: { name: "Lite" } });

    const selectedPersona = resolvePersonaForPlan({
      personaId: "teacher",
      planName: liteUser.plan.name,
    });
    const fallbackPersona = resolvePersonaForPlan({
      personaId: "non-existent",
      planName: liteUser.plan.name,
    });

    expect(selectedPersona.id).toBe("teacher");
    expect(fallbackPersona.id).toBe("strategist");
  });
});
