/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CheckoutSuccessPage from "@/app/(public)/checkout-success/page";

const retrieveSessionMock = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  const StripeMock = vi.fn(function StripeMock() {
    return {
      checkout: {
        sessions: {
          retrieve: retrieveSessionMock,
        },
      },
    };
  });

  return {
    default: StripeMock,
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

async function renderCheckoutSuccessPage(searchParams: {
  session_id?: string | string[];
}) {
  const page = await CheckoutSuccessPage({
    searchParams: Promise.resolve(searchParams),
  });

  render(page);
}

describe("checkout-success page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_1" } as never);
    retrieveSessionMock.mockResolvedValue({ payment_status: "paid" });
  });

  it("redirects unauthenticated visitors to sign-in before Stripe session checks", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(
      CheckoutSuccessPage({
        searchParams: Promise.resolve({
          session_id: "cs_test_paid_123",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/sign-in");

    expect(redirect).toHaveBeenCalledWith("/sign-in");
    expect(retrieveSessionMock).not.toHaveBeenCalled();
  });

  it("shows success UI when Stripe session is paid", async () => {
    await renderCheckoutSuccessPage({
      session_id: "cs_test_paid_123",
    });

    expect(retrieveSessionMock).toHaveBeenCalledWith("cs_test_paid_123");
    expect(
      screen.getByRole("heading", { name: "Payment successful" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Go to profile" }).getAttribute("href"),
    ).toBe("/app/profile");
  });

  it("shows fallback UI when session_id is missing", async () => {
    await renderCheckoutSuccessPage({});

    expect(retrieveSessionMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Payment confirmation unavailable" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to plans" }).getAttribute("href"),
    ).toBe("/app/plans");
  });

  it("shows fallback UI when session_id exceeds 255 chars", async () => {
    await renderCheckoutSuccessPage({
      session_id: "s".repeat(256),
    });

    expect(retrieveSessionMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Payment confirmation unavailable" }),
    ).toBeTruthy();
  });

  it("shows fallback UI when payment_status is not paid", async () => {
    retrieveSessionMock.mockResolvedValue({ payment_status: "unpaid" });

    await renderCheckoutSuccessPage({
      session_id: "cs_test_unpaid_123",
    });

    expect(retrieveSessionMock).toHaveBeenCalledWith("cs_test_unpaid_123");
    expect(
      screen.getByRole("heading", { name: "Payment confirmation unavailable" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to plans" }).getAttribute("href"),
    ).toBe("/app/plans");
  });

  it("shows fallback UI when Stripe secret is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await renderCheckoutSuccessPage({
      session_id: "cs_test_paid_123",
    });

    expect(retrieveSessionMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Payment confirmation unavailable" }),
    ).toBeTruthy();
  });
});
