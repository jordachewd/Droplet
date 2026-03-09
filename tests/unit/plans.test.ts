import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExpiresOn, getPlanIcon, PLAN_LIMITS } from "@/constants/plans";

describe("plans constants", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a 3-day trial duration for Lite plans", () => {
    const expiresOn = getExpiresOn("Lite");

    expect(expiresOn.toISOString()).toBe("2026-03-08T10:00:00.000Z");
  });

  it("adds one month for Pro monthly billing", () => {
    const expiresOn = getExpiresOn("Pro", "Monthly");

    expect(expiresOn.getUTCFullYear()).toBe(2026);
    expect(expiresOn.getUTCMonth()).toBe(3);
    expect(expiresOn.getUTCDate()).toBe(5);
  });

  it("adds one year for Premium yearly billing", () => {
    const expiresOn = getExpiresOn("Premium", "Yearly");

    expect(expiresOn.getUTCFullYear()).toBe(2027);
    expect(expiresOn.getUTCMonth()).toBe(2);
    expect(expiresOn.getUTCDate()).toBe(5);
  });

  it("returns matching plan icons case-insensitively", () => {
    expect(getPlanIcon("pro" as never)).toBe("bi bi-stars");
    expect(getPlanIcon("PREMIUM" as never)).toBe("bi bi-gem");
  });

  it("throws when plan icon is requested for an unknown plan", () => {
    expect(() => getPlanIcon("InvalidPlan" as never)).toThrow(
      "No plan found with the name: InvalidPlan",
    );
  });

  it("defines image and audio limits for each plan", () => {
    expect(PLAN_LIMITS.Lite).toEqual({ images: 3, audio: 0 });
    expect(PLAN_LIMITS.Pro).toEqual({ images: 20, audio: 20 });
    expect(PLAN_LIMITS.Premium).toEqual({ images: -1, audio: -1 });
  });
});
