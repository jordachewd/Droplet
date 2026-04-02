import { describe, expect, it } from "vitest";
import {
  estimateModelCostCents,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { createTestUser } from "../test-support";

describe("ai-model-policy", () => {
  const litePlanTier = normalizePlanTier(
    createTestUser({ plan: { name: "Lite" } }).plan.name,
  );
  const proPlanTier = normalizePlanTier(
    createTestUser({ plan: { name: "Pro" } }).plan.name,
  );
  const premiumPlanTier = normalizePlanTier(
    createTestUser({ plan: { name: "Premium" } }).plan.name,
  );

  it("normalizes plan names and defaults to lite when missing", () => {
    expect(normalizePlanTier()).toBe("lite");
    expect(normalizePlanTier(null)).toBe("lite");
    expect(normalizePlanTier("Pro")).toBe("pro");
    expect(normalizePlanTier("premium")).toBe("premium");
  });

  it("pins title generation to the utility rule model", () => {
    const policy = resolveModelPolicy({
      plan: litePlanTier,
      feature: "title_generation",
      taskClass: "complex",
    });

    expect(policy.taskClass).toBe("utility");
    expect(policy.model).toBe("gpt-4.1-nano");
    expect(policy.fallbackModel).toBe("gpt-4o-mini");
    expect(policy.hardBlocked).toBe(false);
  });

  it("hard blocks requests when budget hard limit is reached", () => {
    const policy = resolveModelPolicy({
      plan: proPlanTier,
      feature: "chat",
      budgetState: "hard_limit_reached",
    });

    expect(policy.hardBlocked).toBe(true);
    expect(policy.wasDowngraded).toBe(false);
    expect(policy.downgradeReasons).toEqual(["hard_limit_reached"]);
    expect(policy.notes).toContain("hard budget limit");
  });

  it("blocks lite audio_in_out requests", () => {
    const policy = resolveModelPolicy({
      plan: litePlanTier,
      feature: "audio_generation",
      audioMode: "audio_in_out",
    });

    expect(policy.hardBlocked).toBe(true);
    expect(policy.model).toBe("gpt-4o-mini-tts");
    expect(policy.notes).toContain("Lite audio_in_out requests are blocked");
  });

  it("forces the TTS model path for tts audio mode", () => {
    const policy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "audio_generation",
      audioMode: "tts",
    });

    expect(policy.model).toBe("gpt-4o-mini-tts");
    expect(policy.fallbackModel).toBe("gpt-4o-mini-tts");
    expect(policy.isTtsOnly).toBe(true);
    expect(policy.hardBlocked).toBe(false);
  });

  it("upgrades premium complex chat to gpt-5.4 only when explicitly requested", () => {
    const normalPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "chat",
      taskClass: "complex",
      explicitPremium: false,
    });
    const upgradedPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "chat",
      taskClass: "complex",
      explicitPremium: true,
    });

    expect(normalPolicy.model).toBe("gpt-4.1");
    expect(upgradedPolicy.model).toBe("gpt-5.4");
    expect(upgradedPolicy.fallbackModel).toBe("gpt-4.1");
  });

  it("applies downgrade signals for chat when a fallback is available", () => {
    const simpleProPolicy = resolveModelPolicy({
      plan: proPlanTier,
      feature: "chat",
      taskClass: "simple",
    });
    const pressuredPremiumPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "chat",
      taskClass: "standard",
      budgetState: "soft_limit_reached",
      highLatency: true,
      retryAttempt: 1,
    });

    expect(simpleProPolicy.model).toBe("gpt-4o-mini");
    expect(simpleProPolicy.wasDowngraded).toBe(true);
    expect(simpleProPolicy.downgradeReasons).toEqual(["simple_task"]);

    expect(pressuredPremiumPolicy.model).toBe("gpt-4o-mini");
    expect(pressuredPremiumPolicy.wasDowngraded).toBe(true);
    expect(pressuredPremiumPolicy.downgradeReasons).toEqual([
      "soft_limit_reached",
      "high_latency",
      "retry_attempt",
    ]);
  });

  it("keeps full-audio model when audio_in_out fallback is tts-only", () => {
    const policy = resolveModelPolicy({
      plan: proPlanTier,
      feature: "audio_generation",
      audioMode: "audio_in_out",
      retryAttempt: 2,
    });

    expect(policy.model).toBe("gpt-audio-mini");
    expect(policy.wasDowngraded).toBe(false);
    expect(policy.downgradeReasons).toEqual([]);
    expect(policy.notes).toContain("TTS fallback blocked");
  });

  it("supports premium video model and admin override", () => {
    const premiumFinalPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "video_generation",
      taskClass: "final",
      explicitPremium: true,
    });
    const overriddenPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "video_generation",
      taskClass: "final",
      explicitPremium: true,
      modelOverrides: {
        videoGenerationModel: "sora-2-custom",
      },
    });

    expect(premiumFinalPolicy.model).toBe("sora-2");
    expect(premiumFinalPolicy.fallbackModel).toBe("sora-2");
    expect(overriddenPolicy.model).toBe("sora-2-custom");
    expect(overriddenPolicy.notes).toContain(
      "Admin override applied for video generation model.",
    );
  });

  it("applies per-feature admin model overrides", () => {
    const chatPolicy = resolveModelPolicy({
      plan: proPlanTier,
      feature: "chat",
      modelOverrides: {
        chat: {
          pro: "gpt-4.1-mini",
        },
      },
    });
    const imagePolicy = resolveModelPolicy({
      plan: litePlanTier,
      feature: "image_generation",
      modelOverrides: {
        imageGenerationModel: "gpt-image-custom",
      },
    });
    const audioPolicy = resolveModelPolicy({
      plan: premiumPlanTier,
      feature: "audio_generation",
      audioMode: "audio_in_out",
      modelOverrides: {
        audioGenerationModel: "gpt-audio-custom",
      },
    });

    expect(chatPolicy.model).toBe("gpt-4.1-mini");
    expect(chatPolicy.notes).toContain(
      "Admin override applied for chat model.",
    );
    expect(imagePolicy.model).toBe("gpt-image-custom");
    expect(audioPolicy.model).toBe("gpt-audio-custom");
  });

  it("estimates flat and token pricing in cents", () => {
    expect(estimateModelCostCents({ model: "gpt-image-1-mini" })).toBe(1.1);
    expect(
      estimateModelCostCents({
        model: "gpt-4.1",
        tokensIn: 1_000_000,
        tokensOut: 0,
      }),
    ).toBe(200);
  });

  it("returns undefined when pricing cannot be computed", () => {
    expect(estimateModelCostCents({ model: "unknown-model" })).toBeUndefined();
    expect(estimateModelCostCents({ model: "gpt-4.1" })).toBeUndefined();
  });
});
