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

  it("allows Lite audio requests while under the audio limit", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 0,
      limitType: "audio",
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(3);
    expect(result.effectiveCount).toBe(0);
  });

  it("enforces the Lite video quota", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 1,
      limitType: "video",
    });

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(1);
    expect(result.remaining).toBe(0);
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

  it("defaults to Lite limits when planName is omitted", () => {
    const result = checkUsageLimit({
      limitType: "images",
      currentCount: 2,
    });

    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(1);
    expect(result.allowed).toBe(true);
  });

  it("uses overrideLimit when provided", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      limitType: "audio",
      currentCount: 2,
      overrideLimit: 2,
    });

    expect(result.limit).toBe(2);
    expect(result.remaining).toBe(0);
    expect(result.allowed).toBe(false);
  });

  it("does not reset usage when usagePeriodStart is invalid", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 2,
      limitType: "images",
      usagePeriodStart: "not-a-real-date",
      now: new Date("2026-03-09T00:00:00.000Z"),
    });

    expect(result.didReset).toBe(false);
    expect(result.effectiveCount).toBe(2);
    expect(result.remaining).toBe(1);
  });

  it("resets usage at exactly the 30-day boundary", () => {
    const result = checkUsageLimit({
      planName: "Lite",
      currentCount: 3,
      limitType: "images",
      usagePeriodStart: "2026-02-07T00:00:00.000Z",
      now: new Date("2026-03-09T00:00:00.000Z"),
    });

    expect(result.didReset).toBe(true);
    expect(result.effectiveCount).toBe(0);
    expect(result.remaining).toBe(3);
  });
});
