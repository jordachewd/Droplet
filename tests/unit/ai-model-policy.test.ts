import { describe, expect, it } from "vitest";
import { MODEL_POLICY, resolveModelForPlan } from "@/lib/utils/ai-model-policy";

const requestTypes = ["chat", "title", "image", "audio", "video"] as const;

describe("ai-model-policy", () => {
  it("covers every plan and request type combination", () => {
    for (const planName of ["Lite", "Pro", "Premium"] as const) {
      for (const requestType of requestTypes) {
        expect(MODEL_POLICY[planName][requestType]).toBeDefined();
      }
    }
  });

  it("resolves the approved chat models per plan", () => {
    expect(resolveModelForPlan("Lite", "chat")).toBe("gpt-4o-mini");
    expect(resolveModelForPlan("Pro", "chat")).toBe("gpt-5.2-pro");
    expect(resolveModelForPlan("Premium", "chat")).toBe("gpt-5.4-pro");
  });

  it("uses gpt-4o-mini for title generation on every plan", () => {
    expect(resolveModelForPlan("Lite", "title")).toBe("gpt-4o-mini");
    expect(resolveModelForPlan("Pro", "title")).toBe("gpt-4o-mini");
    expect(resolveModelForPlan("Premium", "title")).toBe("gpt-4o-mini");
  });

  it("returns the shared image and audio models for all plans", () => {
    for (const planName of ["Lite", "Pro", "Premium"] as const) {
      expect(resolveModelForPlan(planName, "image")).toBe("dall-e-3");
      expect(resolveModelForPlan(planName, "audio")).toBe(
        "gpt-4o-audio-preview",
      );
    }
  });

  it("restricts video model resolution to Premium", () => {
    expect(resolveModelForPlan("Lite", "video")).toBeNull();
    expect(resolveModelForPlan("Pro", "video")).toBeNull();
    expect(resolveModelForPlan("Premium", "video")).toBe(
      "premium-video-placeholder",
    );
  });
});
