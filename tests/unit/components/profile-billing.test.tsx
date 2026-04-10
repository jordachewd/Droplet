/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileBilling from "@/components/sections/profile/profile-billing";
import type { Transaction } from "@/types/TransactionData.d";
import {
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from "@/lib/actions/transaction.action";
import { useRouter } from "next/navigation";

vi.mock("@/lib/actions/transaction.action", () => ({
  cancelSubscriptionAction: vi.fn(),
  reactivateSubscriptionAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const refreshMock = vi.hoisted(() => vi.fn());

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      refresh: refreshMock,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(cancelSubscriptionAction).mockResolvedValue({
      status: 200,
      message:
        "Subscription cancellation is scheduled for the end of this billing period.",
      severity: "success",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: true,
    });
    vi.mocked(reactivateSubscriptionAction).mockResolvedValue({
      status: 200,
      message:
        "Scheduled cancellation removed. Subscription will renew normally.",
      severity: "success",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
    });
  });

  it("renders a configurable currency symbol for transaction amounts", () => {
    render(
      <ProfileBilling
        stripeId="stripe_active"
        stripeSubscriptionId="sub_123"
        planName="Pro"
        subscriptionStatus="active"
        cancelAtPeriodEnd={false}
        nextBillingDate={new Date("2026-02-01T00:00:00.000Z")}
        isAdmin={false}
        userTxns={[transaction]}
        currencySymbol="€"
      />,
    );

    expect(screen.getByText("€", { exact: false }).textContent).toContain("€");
    expect(screen.getByText(/€19/)).toBeTruthy();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("opens confirmation and schedules cancellation", async () => {
    render(
      <ProfileBilling
        stripeId="stripe_active"
        stripeSubscriptionId="sub_123"
        planName="Pro"
        subscriptionStatus="active"
        cancelAtPeriodEnd={false}
        nextBillingDate={new Date("2026-02-01T00:00:00.000Z")}
        isAdmin={false}
        userTxns={[transaction]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel at period end" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    await waitFor(() => {
      expect(cancelSubscriptionAction).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows reactivation action when cancellation is already scheduled", () => {
    render(
      <ProfileBilling
        stripeId="stripe_active"
        stripeSubscriptionId="sub_123"
        planName="Pro"
        subscriptionStatus="active"
        cancelAtPeriodEnd
        nextBillingDate={new Date("2026-02-01T00:00:00.000Z")}
        isAdmin={false}
        userTxns={[transaction]}
      />,
    );

    expect(screen.getByText("Canceling")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Keep subscription active" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Cancel at period end" }),
    ).toBeNull();
  });

  it("shows past due status and keeps cancellation option available", () => {
    render(
      <ProfileBilling
        stripeId="stripe_active"
        stripeSubscriptionId="sub_123"
        planName="Pro"
        subscriptionStatus="past_due"
        cancelAtPeriodEnd={false}
        nextBillingDate={new Date("2026-02-01T00:00:00.000Z")}
        isAdmin={false}
        userTxns={[transaction]}
      />,
    );

    expect(screen.getByText("Past due")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Cancel at period end" }),
    ).toBeTruthy();
  });
});
