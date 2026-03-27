/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanPromo from "@/components/shared/plan-promo";
import { PlanData } from "@/types/PlanData.d";

const litePlan: PlanData = {
  id: "0",
  name: "Lite",
  amount: 0,
  billing: "Monthly",
  startedOn: new Date("2026-01-01T00:00:00.000Z"),
  expiresOn: new Date("9999-12-31T23:59:59.999Z"),
  imageGenerations: 0,
  audioGenerations: 0,
  videoGenerations: 0,
};

describe("PlanPromo", () => {
  it("shows upgrade CTA for non-suspended users on non-premium plans", () => {
    render(<PlanPromo plan={litePlan} role="client" />);

    expect(
      screen.getByText("Unlock premium features with an upgrade!"),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upgrade now" })).toBeTruthy();
  });

  it("shows suspension notice and contact support CTA for suspended users", () => {
    render(
      <PlanPromo
        plan={litePlan}
        role="client"
        isSuspended
        supportEmail="support@droplet.example"
      />,
    );

    expect(screen.getByText("Account suspended")).toBeTruthy();
    expect(
      screen.getByText(
        "Your account is suspended. Contact support to restore access.",
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Contact support" })
        .getAttribute("href"),
    ).toBe("mailto:support@droplet.example");
    expect(screen.queryByRole("link", { name: "Upgrade now" })).toBeNull();
  });
});
