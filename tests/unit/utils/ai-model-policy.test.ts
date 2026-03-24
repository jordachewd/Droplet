import { describe, expect, it } from "vitest";
import {
  estimateModelCostCents,
  MODEL_POLICY_MATRIX,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";

const plans = ["lite", "pro", "premium"] as const;
const features = [
  "title_generation",
  "chat",
  "image_generation",
  "audio_generation",
  "video_generation",
] as const;

describe("ai-model-policy", () => {
  it("normalizes PlanName and tier values into internal plan tiers", () => {
    expect(normalizePlanTier("Lite")).toBe("lite");
    expect(normalizePlanTier("Pro")).toBe("pro");
    expect(normalizePlanTier("Premium")).toBe("premium");
    expect(normalizePlanTier("premium")).toBe("premium");
    expect(normalizePlanTier(undefined)).toBe("lite");
    expect(normalizePlanTier(null)).toBe("lite");
  });

  it("covers every plan and feature combination in the policy matrix", () => {
    for (const plan of plans) {
      for (const feature of features) {
        expect(MODEL_POLICY_MATRIX[plan][feature]).toBeDefined();
        expect(
          MODEL_POLICY_MATRIX[plan][feature].defaultTaskClass,
        ).toBeDefined();
        expect(
          Object.keys(MODEL_POLICY_MATRIX[plan][feature].taskClasses).length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("pins title generation to gpt-4.1-nano across every plan", () => {
    for (const plan of plans) {
      expect(
        resolveModelPolicy({
          plan,
          feature: "title_generation",
        }),
      ).toMatchObject({
        model: "gpt-4.1-nano",
        fallbackModel: "gpt-4o-mini",
        taskClass: "utility",
        maxInputTokens: 1_200,
        maxOutputTokens: 20,
        hardBlocked: false,
        wasDowngraded: false,
      });
    }
  });

  it("resolves the default chat models and token caps by plan", () => {
    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "chat",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      fallbackModel: "gpt-4.1-nano",
      taskClass: "standard",
      maxInputTokens: 12_000,
      maxOutputTokens: 900,
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "chat",
      }),
    ).toMatchObject({
      model: "gpt-4.1",
      fallbackModel: "gpt-4o-mini",
      taskClass: "standard",
      maxInputTokens: 24_000,
      maxOutputTokens: 1_400,
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
      }),
    ).toMatchObject({
      model: "gpt-4.1",
      fallbackModel: "gpt-4o-mini",
      taskClass: "standard",
      maxInputTokens: 32_000,
      maxOutputTokens: 1_800,
      hardBlocked: false,
    });
  });

  it("resolves image and audio models per plan", () => {
    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "image_generation",
      }),
    ).toMatchObject({
      model: "gpt-image-1-mini",
      taskClass: "final",
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "image_generation",
      }),
    ).toMatchObject({
      model: "gpt-image-1.5",
      fallbackModel: "gpt-image-1-mini",
      taskClass: "final",
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "audio_generation",
        audioMode: "tts",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini-tts",
      fallbackModel: "gpt-4o-mini-tts",
      taskClass: "final",
      hardBlocked: false,
    });
  });

  it("applies runtime model overrides for chat, image, audio, and video", () => {
    const modelOverrides = {
      chat: {
        lite: "gpt-4.1-mini",
      },
      imageGenerationModel: "gpt-image-1",
      audioGenerationModel: "gpt-audio-1.5",
      videoGenerationModel: "sora-2-pro",
    };

    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "chat",
        modelOverrides,
      }),
    ).toMatchObject({
      model: "gpt-4.1-mini",
    });

    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "image_generation",
        modelOverrides,
      }),
    ).toMatchObject({
      model: "gpt-image-1",
    });

    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "audio_generation",
        audioMode: "audio_in_out",
        modelOverrides,
      }),
    ).toMatchObject({
      model: "gpt-audio-1.5",
    });

    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "video_generation",
        modelOverrides,
      }),
    ).toMatchObject({
      model: "sora-2-pro",
    });
  });

  it("enables Lite TTS audio and Lite/Pro video while still honoring hard budget limits", () => {
    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "audio_generation",
        audioMode: "tts",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini-tts",
      fallbackModel: "gpt-4o-mini-tts",
      hardBlocked: false,
      taskClass: "final",
    });
    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "audio_generation",
        audioMode: "audio_in_out",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini-tts",
      hardBlocked: true,
      taskClass: "final",
    });
    expect(
      resolveModelPolicy({
        plan: "lite",
        feature: "video_generation",
      }),
    ).toMatchObject({
      model: "sora-2",
      fallbackModel: "sora-2",
      hardBlocked: false,
      taskClass: "preview",
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "video_generation",
      }),
    ).toMatchObject({
      model: "sora-2",
      fallbackModel: "sora-2",
      hardBlocked: false,
      taskClass: "preview",
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        budgetState: "hard_limit_reached",
      }),
    ).toMatchObject({
      model: "gpt-4.1",
      hardBlocked: true,
      wasDowngraded: false,
      downgradeReasons: ["hard_limit_reached"],
    });
  });

  it("downgrades on soft budget, latency, retry, and Pro simple chat", () => {
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "chat",
        taskClass: "simple",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      fallbackModel: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["simple_task"],
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "chat",
        budgetState: "soft_limit_reached",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["soft_limit_reached"],
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "chat",
        highLatency: true,
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["high_latency"],
    });
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "chat",
        retryAttempt: 1,
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["retry_attempt"],
    });
  });

  it("only uses gpt-5.4 for explicit premium complex chat", () => {
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        taskClass: "complex",
      }),
    ).toMatchObject({
      model: "gpt-4.1",
      fallbackModel: "gpt-4.1-mini",
      wasDowngraded: false,
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        taskClass: "complex",
        explicitPremium: true,
      }),
    ).toMatchObject({
      model: "gpt-5.4",
      fallbackModel: "gpt-4.1",
      wasDowngraded: false,
    });
  });

  it("downgrades premium chat to fallback models on retry attempts", () => {
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        taskClass: "standard",
        retryAttempt: 1,
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      fallbackModel: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["retry_attempt"],
    });

    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        taskClass: "complex",
        retryAttempt: 1,
      }),
    ).toMatchObject({
      model: "gpt-4.1-mini",
      fallbackModel: "gpt-4.1-mini",
      wasDowngraded: true,
      downgradeReasons: ["retry_attempt"],
    });
  });

  it("downgrades premium chat to fallback models under high latency", () => {
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "chat",
        taskClass: "simple",
        highLatency: true,
      }),
    ).toMatchObject({
      model: "gpt-4o-mini",
      fallbackModel: "gpt-4o-mini",
      wasDowngraded: true,
      downgradeReasons: ["high_latency"],
    });
  });

  it("routes premium video to sora-2 by default and sora-2-pro only for explicit final renders", () => {
    expect(
      MODEL_POLICY_MATRIX.premium.video_generation.taskClasses.final,
    ).toMatchObject({
      model: "sora-2",
      notes: expect.stringContaining("explicitPremium"),
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "video_generation",
      }),
    ).toMatchObject({
      model: "sora-2",
      fallbackModel: "sora-2",
      taskClass: "preview",
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "video_generation",
        taskClass: "final",
      }),
    ).toMatchObject({
      model: "sora-2",
      fallbackModel: "sora-2",
      taskClass: "final",
      hardBlocked: false,
    });
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "video_generation",
        taskClass: "final",
        explicitPremium: true,
      }),
    ).toMatchObject({
      model: "sora-2-pro",
      fallbackModel: "sora-2",
      taskClass: "final",
      hardBlocked: false,
    });
  });

  it("pins TTS requests to the speech model and blocks TTS fallback for audio_in_out requests", () => {
    expect(
      resolveModelPolicy({
        plan: "pro",
        feature: "audio_generation",
        audioMode: "tts",
        budgetState: "soft_limit_reached",
      }),
    ).toMatchObject({
      model: "gpt-4o-mini-tts",
      fallbackModel: "gpt-4o-mini-tts",
      isTtsOnly: true,
      wasDowngraded: false,
      downgradeReasons: [],
    });

    const fullAudioPolicy = resolveModelPolicy({
      plan: "pro",
      feature: "audio_generation",
      audioMode: "audio_in_out",
      budgetState: "soft_limit_reached",
    });

    expect(fullAudioPolicy).toMatchObject({
      model: "gpt-audio-mini",
      fallbackModel: "gpt-4o-mini-tts",
      isTtsOnly: false,
      wasDowngraded: false,
      downgradeReasons: [],
    });
    expect(fullAudioPolicy.notes).toContain("TTS fallback blocked");
  });

  it("uses the verified full-audio model for Premium audio_in_out requests", () => {
    expect(
      resolveModelPolicy({
        plan: "premium",
        feature: "audio_generation",
        audioMode: "audio_in_out",
      }),
    ).toMatchObject({
      model: "gpt-audio-mini",
      fallbackModel: "gpt-audio-mini",
      isTtsOnly: false,
      hardBlocked: false,
    });
  });

  it("estimates costs for the new model identifiers", () => {
    expect(
      estimateModelCostCents({
        model: "gpt-4.1-nano",
        tokensIn: 1_000_000,
        tokensOut: 1_000_000,
      }),
    ).toBe(50);
    expect(
      estimateModelCostCents({
        model: "gpt-image-1.5",
      }),
    ).toBe(3.4);
    expect(
      estimateModelCostCents({
        model: "sora-2",
      }),
    ).toBe(10);
  });

  it("falls back to the feature default task class when an unsupported task class is requested", () => {
    const imagePolicy = resolveModelPolicy({
      plan: "lite",
      feature: "image_generation",
      taskClass: "complex",
    });

    expect(imagePolicy.taskClass).toBe("final");
    expect(imagePolicy.model).toBe("gpt-image-1-mini");

    const videoPolicy = resolveModelPolicy({
      plan: "pro",
      feature: "video_generation",
      taskClass: "complex",
    });

    expect(videoPolicy.taskClass).toBe("preview");
    expect(videoPolicy.model).toBe("sora-2");
  });

  it("honors hardBlocked rules when configured in the model policy matrix", () => {
    const imageFinalRule = MODEL_POLICY_MATRIX.lite.image_generation.taskClasses
      .final as {
      hardBlocked?: boolean;
    };
    const previousHardBlocked = imageFinalRule.hardBlocked;
    imageFinalRule.hardBlocked = true;

    try {
      const policy = resolveModelPolicy({
        plan: "lite",
        feature: "image_generation",
      });

      expect(policy.hardBlocked).toBe(true);
      expect(policy.wasDowngraded).toBe(false);
    } finally {
      imageFinalRule.hardBlocked = previousHardBlocked;
    }
  });

  it("throws when a feature policy has no resolvable task class rule", () => {
    const chatPolicy = MODEL_POLICY_MATRIX.lite.chat as {
      defaultTaskClass: string;
      taskClasses: Record<string, unknown>;
    };
    const previousTaskClasses = chatPolicy.taskClasses;
    chatPolicy.taskClasses = {};

    try {
      expect(() =>
        resolveModelPolicy({
          plan: "lite",
          feature: "chat",
        }),
      ).toThrow("No model policy rule configured");
    } finally {
      chatPolicy.taskClasses = previousTaskClasses;
    }
  });

  it("returns undefined cost when pricing metadata is unavailable or no tokens were billed", () => {
    expect(
      estimateModelCostCents({
        model: "unknown-model",
        tokensIn: 1_000,
        tokensOut: 2_000,
      }),
    ).toBeUndefined();

    expect(
      estimateModelCostCents({
        model: "gpt-4.1",
      }),
    ).toBeUndefined();
  });
});
