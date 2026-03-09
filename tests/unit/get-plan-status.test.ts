import { describe, expect, it } from "vitest";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import { Plan, PlanData } from "@/types/PlanData.d";

const litePlan: Plan = {
  id: 0,
  name: "Lite",
  desc: "Lite",
  icon: "icon-lite",
  price: 0,
  inclusions: [],
};

const proPlan: Plan = {
  id: 1,
  name: "Pro",
  desc: "Pro",
  icon: "icon-pro",
  price: 29,
  inclusions: [],
};

const premiumPlan: Plan = {
  id: 2,
  name: "Premium",
  desc: "Premium",
  icon: "icon-premium",
  price: 69,
  inclusions: [],
};

function buildUserPlan(overrides: Partial<PlanData> = {}): PlanData {
  return {
    id: "1",
    name: "Pro",
    amount: 29,
    billing: "Monthly",
    startedOn: new Date("2026-01-01T00:00:00.000Z"),
    expiresOn: new Date("2026-02-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("getPlanStatus", () => {
  it("marks Pro as popular for users without a paid plan", () => {
    const status = getPlanStatus({
      plan: proPlan,
      yearly: false,
      planFee: proPlan.price,
      userPlan: buildUserPlan({
        id: "0",
        name: "Lite",
        amount: 0,
        billing: "Monthly",
      }),
    });

    expect(status).toEqual({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });

  it("marks Pro as current for matching user plan and billing cycle", () => {
    const status = getPlanStatus({
      plan: proPlan,
      yearly: false,
      planFee: proPlan.price,
      userPlan: buildUserPlan(),
    });

    expect(status).toEqual({
      isIncluded: true,
      isCurrent: true,
      isPopular: false,
    });
  });

  it("does not mark Pro as current for billing mismatch", () => {
    const status = getPlanStatus({
      plan: proPlan,
      yearly: true,
      planFee: proPlan.price,
      userPlan: buildUserPlan({ billing: "Monthly" }),
    });

    expect(status.isCurrent).toBe(false);
  });

  it("marks Premium as popular for paid users below Premium tier", () => {
    const status = getPlanStatus({
      plan: premiumPlan,
      yearly: false,
      planFee: premiumPlan.price,
      userPlan: buildUserPlan({
        id: "1",
        name: "Pro",
        amount: 29,
      }),
    });

    expect(status).toEqual({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });

  it("marks Lite as current only when Lite is active", () => {
    const liteStatus = getPlanStatus({
      plan: litePlan,
      yearly: false,
      planFee: litePlan.price,
      userPlan: buildUserPlan({
        id: "0",
        name: "Lite",
        amount: 0,
      }),
    });

    const paidStatus = getPlanStatus({
      plan: litePlan,
      yearly: false,
      planFee: litePlan.price,
      userPlan: buildUserPlan({
        id: "1",
        name: "Pro",
      }),
    });

    expect(liteStatus.isCurrent).toBe(true);
    expect(paidStatus.isCurrent).toBe(false);
  });
});
