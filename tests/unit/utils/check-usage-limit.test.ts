import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "@/constants/plans";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";
import { createTestUser } from "../test-support";

describe("check-usage-limit", () => {
  const liteUser = createTestUser({ plan: { name: "Lite" } });
  const premiumUser = createTestUser({ plan: { name: "Premium" } });

  it("allows usage under the configured limit", () => {
    const result = checkUsageLimit({
      planName: liteUser.plan.name,
      currentCount: 2,
      limitType: "images",
    });

    expect(result).toEqual({
      allowed: true,
      limit: PLAN_LIMITS.Lite.images,
      remaining: 1,
      didReset: false,
      effectiveCount: 2,
    });
  });

  it("blocks usage when the effective count reaches the limit", () => {
    const result = checkUsageLimit({
      planName: liteUser.plan.name,
      currentCount: PLAN_LIMITS.Lite.audio,
      limitType: "audio",
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.effectiveCount).toBe(PLAN_LIMITS.Lite.audio);
  });

  it("treats unlimited plans as always allowed", () => {
    const result = checkUsageLimit({
      planName: premiumUser.plan.name,
      currentCount: 500,
      limitType: "audio",
    });

    expect(result).toEqual({
      allowed: true,
      limit: -1,
      remaining: -1,
      didReset: false,
      effectiveCount: 0,
    });
  });

  it("resets effective count when usage period is older than 30 days", () => {
    const result = checkUsageLimit({
      planName: liteUser.plan.name,
      currentCount: 99,
      limitType: "images",
      usagePeriodStart: "2026-01-01T00:00:00.000Z",
      now: new Date("2026-03-24T00:00:00.000Z"),
    });

    expect(result.didReset).toBe(true);
    expect(result.effectiveCount).toBe(0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(PLAN_LIMITS.Lite.images);
  });

  it("keeps effective count when usage period is invalid", () => {
    const result = checkUsageLimit({
      planName: liteUser.plan.name,
      currentCount: 1,
      limitType: "audio",
      usagePeriodStart: "invalid-date",
      now: new Date("2026-03-24T00:00:00.000Z"),
    });

    expect(result.didReset).toBe(false);
    expect(result.effectiveCount).toBe(1);
    expect(result.remaining).toBe(2);
    expect(result.allowed).toBe(true);
  });

  it("uses override limits when provided", () => {
    const result = checkUsageLimit({
      planName: liteUser.plan.name,
      currentCount: 1,
      limitType: "images",
      overrideLimit: 5,
    });

    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
    expect(result.allowed).toBe(true);
  });

  it("defaults missing plan and count safely", () => {
    const result = checkUsageLimit({
      planName: null,
      currentCount: null,
      limitType: "audio",
    });

    expect(result.limit).toBe(PLAN_LIMITS.Lite.audio);
    expect(result.effectiveCount).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
