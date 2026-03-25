import { describe, expect, it } from "vitest";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import { Plan, PlanData } from "@/types/PlanData.d";

function createPlan(id: number, price: number, name: Plan["name"]): Plan {
  return {
    id,
    name,
    desc: `${name} plan`,
    icon: "bi-droplet",
    price,
    inclusions: [],
  };
}

function createUserPlan(
  id: string,
  amount: number,
  name: PlanData["name"],
): PlanData {
  return {
    id,
    name,
    amount,
    billing: "Monthly",
    startedOn: new Date("2026-03-01T00:00:00.000Z"),
    expiresOn: new Date("2026-04-01T00:00:00.000Z"),
  };
}

describe("getPlanStatus", () => {
  it("marks lite plan as included and current for lite users", () => {
    const result = getPlanStatus({
      plan: createPlan(0, 0, "Lite"),
      planFee: 0,
      userPlan: createUserPlan("0", 0, "Lite"),
    });

    expect(result).toEqual({
      isIncluded: true,
      isCurrent: true,
      isPopular: false,
    });
  });

  it("marks pro plan as popular for lite users", () => {
    const result = getPlanStatus({
      plan: createPlan(1, 19, "Pro"),
      planFee: 19,
      userPlan: createUserPlan("0", 0, "Lite"),
    });

    expect(result).toEqual({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });

  it("marks premium plan as popular for pro users when not included", () => {
    const result = getPlanStatus({
      plan: createPlan(2, 39, "Premium"),
      planFee: 39,
      userPlan: createUserPlan("1", 19, "Pro"),
    });

    expect(result).toEqual({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });

  it("marks lower plans as included but not current for higher-tier users", () => {
    const result = getPlanStatus({
      plan: createPlan(1, 19, "Pro"),
      planFee: 19,
      userPlan: createUserPlan("2", 39, "Premium"),
    });

    expect(result).toEqual({
      isIncluded: true,
      isCurrent: false,
      isPopular: false,
    });
  });

  it("marks pro plan as popular when no user plan is provided", () => {
    const result = getPlanStatus({
      plan: createPlan(1, 19, "Pro"),
      planFee: 19,
      userPlan: undefined,
    });

    expect(result).toEqual({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });
});
