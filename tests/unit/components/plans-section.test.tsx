/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/types/PlanData.d";
import Plans from "@/components/sections/shared/plans-section";
import { useUser } from "@clerk/nextjs";

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
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

vi.mock("@/components/shared/plan-card", () => ({
  default: ({ plan }: { plan: Plan }) => (
    <div data-testid={`plan-${plan.name}`} />
  ),
}));

vi.mock("@/components/shared/loading-bubbles", () => ({
  default: () => <div data-testid="loading-bubbles" />,
}));

const plansData: Plan[] = [
  {
    id: 0,
    name: "Lite",
    desc: "Free",
    icon: "bi bi-lightning",
    price: 0,
    inclusions: [],
  },
  {
    id: 1,
    name: "Pro",
    desc: "Advanced",
    icon: "bi bi-stars",
    price: 19,
    inclusions: [],
  },
];

describe("Plans section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
  });

  it("shows loading state when loader is requested without user data", () => {
    render(<Plans hasLoader plansData={plansData} userData={null} />);

    expect(screen.getByTestId("loading-bubbles")).toBeTruthy();
  });

  it("renders plan cards for each plan", () => {
    render(<Plans plansData={plansData} />);

    expect(screen.getByTestId("plan-Lite")).toBeTruthy();
    expect(screen.getByTestId("plan-Pro")).toBeTruthy();
  });

  it("shows subscribe CTA for signed-out users", () => {
    render(<Plans plansData={plansData} />);

    const subscribeLink = screen.getByRole("link", { name: "Subscribe Now" });
    expect(subscribeLink.getAttribute("href")).toBe("/sign-up");
  });

  it("renders a custom subscribe CTA label when provided", () => {
    render(<Plans plansData={plansData} subscribeCtaLabel="Upgrade Today" />);

    const subscribeLink = screen.getByRole("link", { name: "Upgrade Today" });
    expect(subscribeLink.getAttribute("href")).toBe("/sign-up");
  });

  it("hides subscribe CTA for signed-in users", () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {},
    } as unknown as ReturnType<typeof useUser>);

    render(<Plans plansData={plansData} />);

    expect(screen.queryByRole("link", { name: "Subscribe Now" })).toBeNull();
  });
});
