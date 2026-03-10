import { describe, expect, it } from "vitest";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";

describe("checkUsageLimit", () => {
  it("returns false for Lite image generation at limit", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 3,
      limitType: "images",
    });

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(0);
  });

  it("returns true for Pro audio generation under limit", () => {
    const result = checkUsageLimit({
      planName: "Pro",
      currentCount: 7,
      limitType: "audio",
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(43);
  });

  it("enforces the Lite combined media cap for audio requests", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 1,
      combinedCount: 3,
      limitType: "audio",
    });

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(0);
    expect(result.effectiveCount).toBe(3);
  });

  it("returns true for Premium unlimited usage", () => {
    const result = checkUsageLimit({
      planName: "Premium",
      currentCount: 9999,
      limitType: "images",
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
    expect(result.remaining).toBe(-1);
  });

  it("resets effective usage when period start is older than 30 days", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 3,
      limitType: "images",
      usagePeriodStart: "2026-01-01T00:00:00.000Z",
      now: new Date("2026-03-09T00:00:00.000Z"),
    });

    expect(result.didReset).toBe(true);
    expect(result.effectiveCount).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
