import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getExpiresOn,
  getPlanIcon,
  PLAN_LIMITS,
  plans,
} from "@/constants/plans";

describe("plans constants", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a sentinel no-expiry date for Lite plans", () => {
    const expiresOn = getExpiresOn("Lite");

    expect(expiresOn.toISOString()).toBe("9999-12-31T23:59:59.999Z");
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

  it("defines the approved limits for every plan", () => {
    expect(PLAN_LIMITS.Lite).toEqual({
      images: 3,
      audio: 3,
      video: 1,
      conversationsPerDay: 5,
      promptsPerConversation: 10,
    });
    expect(PLAN_LIMITS.Pro).toEqual({
      images: 50,
      audio: 50,
      video: 10,
      conversationsPerDay: 50,
      promptsPerConversation: 100,
    });
    expect(PLAN_LIMITS.Premium).toEqual({
      images: -1,
      audio: -1,
      video: 10,
      conversationsPerDay: -1,
      promptsPerConversation: -1,
    });
  });

  it("defines current pricing and plan copy without trial language", () => {
    expect(plans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Lite",
          price: 0,
          desc: "Free forever",
          icon: "bi bi-lightning",
          inclusions: expect.arrayContaining([
            expect.objectContaining({
              label: "All 9 personas",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "5 conversations per day",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "10 messages per conversation",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "3 image generations per month",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "3 audio generations per month",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "1 video generation per month (coming soon)",
              isIncluded: true,
            }),
          ]),
        }),
        expect.objectContaining({
          name: "Pro",
          price: 19,
          desc: "Advanced AI for power users",
          inclusions: expect.arrayContaining([
            expect.objectContaining({
              label: "10 video generations per month (coming soon)",
              isIncluded: true,
            }),
          ]),
        }),
        expect.objectContaining({
          name: "Premium",
          price: 39,
          desc: "Ultimate AI experience with premium media",
          inclusions: expect.arrayContaining([
            expect.objectContaining({
              label: "Quality image generation (Premium)",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "Quality audio generation (Premium)",
              isIncluded: true,
            }),
            expect.objectContaining({
              label: "10 video generations per month (coming soon)",
              isIncluded: true,
            }),
          ]),
        }),
      ]),
    );

    const allPlanCopy = plans
      .flatMap((plan) => [
        plan.desc,
        ...plan.inclusions.map((item) => item.label),
      ])
      .join(" ")
      .toLowerCase();

    expect(allPlanCopy).not.toContain("trial");
  });
});
