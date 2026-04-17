/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "@/components/shared/checkout-form";
import { checkoutPlan } from "@/lib/actions/transaction.action";
import { useFormStatus } from "react-dom";
import type { CheckoutPlanParams, PlanStatus } from "@/types/PlanData.d";

vi.mock("@/lib/actions/transaction.action", () => ({
  checkoutPlan: vi.fn(),
}));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");

  return {
    ...actual,
    useFormStatus: vi.fn(() => ({
      pending: false,
      data: null,
      method: null,
      action: null,
    })),
  };
});

const basePlan: CheckoutPlanParams = {
  id: 1,
  billing: "Monthly",
  name: "Pro",
  price: 19,
};

const basePlanStatus: PlanStatus = {
  isIncluded: false,
  isCurrent: false,
  isPopular: false,
};

const idleFormStatus = {
  pending: false,
  data: null,
  method: null,
  action: null,
} as unknown as ReturnType<typeof useFormStatus>;

describe("Checkout form", () => {
  beforeEach(() => {
    vi.mocked(checkoutPlan).mockResolvedValue(undefined);
    vi.mocked(useFormStatus).mockReturnValue(idleFormStatus);
  });

  it("renders subscribe button for non-included plans", () => {
    render(<Checkout plan={basePlan} planStatus={basePlanStatus} />);

    expect(screen.getByRole("button", { name: "Subscribe" })).toBeTruthy();
  });

  it("submits checkout with selected plan payload", async () => {
    const { container } = render(
      <Checkout plan={basePlan} planStatus={basePlanStatus} />,
    );
    const form = container.querySelector("form.Checkout");

    expect(form).toBeTruthy();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(checkoutPlan).toHaveBeenCalledWith({ plan: basePlan });
    });
  });

  it("renders disabled current state for included current plans", () => {
    render(
      <Checkout
        plan={basePlan}
        planStatus={{ isIncluded: true, isCurrent: true, isPopular: false }}
      />,
    );

    const button = screen.getByRole("button", { name: "Current Plan" });
    expect(button.getAttribute("disabled")).not.toBeNull();
  });
});
