/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileBilling from "@/components/sections/profile/profile-billing";
import type { Transaction } from "@/types/TransactionData.d";

const transaction: Transaction = {
  id: "txn_1",
  plan: "Pro",
  amount: 19,
  billing: "Monthly",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresOn: new Date("2026-02-01T00:00:00.000Z"),
  stripeId: "stripe_active",
};

describe("ProfileBilling", () => {
  it("renders a configurable currency symbol for transaction amounts", () => {
    render(
      <ProfileBilling
        stripeId="stripe_active"
        userTxns={[transaction]}
        currencySymbol="€"
      />,
    );

    expect(screen.getByText("€", { exact: false }).textContent).toContain("€");
    expect(screen.getByText(/€19/)).toBeTruthy();
  });
});
