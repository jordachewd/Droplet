/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanCard from "@/components/shared/plan-card";
import type { Plan } from "@/types/PlanData.d";
import type { UserData } from "@/types/UserData.d";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import type { CheckoutPlanParams } from "@/types/PlanData.d";

const { checkoutRenderMock } = vi.hoisted(() => ({
  checkoutRenderMock: vi.fn(),
}));

vi.mock("@/lib/utils/getPlanStatus", () => ({
  getPlanStatus: vi.fn(),
}));

vi.mock("@/components/shared/checkout-form", () => ({
  default: ({ plan }: { plan: CheckoutPlanParams }) => {
    checkoutRenderMock(plan);
    return <button type="button">Subscribe</button>;
  },
}));

const basePlan: Plan = {
  id: 1,
  name: "Pro",
  desc: "For growing teams",
  icon: "bi bi-stars",
  price: 19,
  inclusions: [
    { label: "50 conversations/day", isIncluded: true },
    { label: "10 audio generations/month", isIncluded: true },
  ],
};

const baseUserData = {
  plan: {
    id: "0",
    name: "Lite",
    amount: 0,
    billing: "Monthly",
    expiresOn: new Date("9999-12-31T23:59:59.999Z"),
    startedOn: new Date("2026-01-01T00:00:00.000Z"),
  },
} as UserData;

describe("PlanCard", () => {
  beforeEach(() => {
    checkoutRenderMock.mockReset();
    vi.mocked(getPlanStatus).mockReturnValue({
      isIncluded: false,
      isCurrent: false,
      isPopular: true,
    });
  });

  it("renders plan title, price, and inclusions", () => {
    render(
      <PlanCard plan={basePlan} userData={baseUserData} currencySymbol="$" />,
    );

    expect(screen.getByRole("heading", { name: "Pro" })).toBeTruthy();
    expect(screen.getByText("$19")).toBeTruthy();
    expect(screen.getByText("For growing teams")).toBeTruthy();
    expect(screen.getByText("50 conversations/day")).toBeTruthy();
    expect(screen.getByText("10 audio generations/month")).toBeTruthy();
  });

  it("renders checkout CTA when user data is available", () => {
    render(
      <PlanCard plan={basePlan} userData={baseUserData} currencySymbol="$" />,
    );

    expect(screen.getByRole("button", { name: "Subscribe" })).toBeTruthy();
  });

  it("renders a custom popular badge label when provided", () => {
    render(
      <PlanCard
        plan={basePlan}
        userData={baseUserData}
        currencySymbol="$"
        popularBadgeLabel="Most Chosen"
      />,
    );

    expect(screen.getByText("Most Chosen")).toBeTruthy();
  });

  it("shows yearly pricing details and passes yearly checkout payload", () => {
    render(
      <PlanCard
        plan={basePlan}
        userData={baseUserData}
        currencySymbol="$"
        billingCycle="Yearly"
        yearlyDiscount={30}
      />,
    );

    expect(screen.getByText("$159.60")).toBeTruthy();
    expect(screen.getByText("$159.60/year - Save 30%")).toBeTruthy();
    expect(checkoutRenderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: "Yearly",
        price: 159.6,
      }),
    );
  });
});
