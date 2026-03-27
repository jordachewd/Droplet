/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import HeroSection from "@/components/sections/homepage/hero-section";

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: Record<string, unknown>) => (
    <img alt={String(alt ?? "")} src={String(src ?? "")} {...props} />
  ),
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

describe("HeroSection", () => {
  it("renders the homepage headline, CTA, and hero image", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", {
        name: "Chat, create, and get things done.",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Try it for free" })
        .getAttribute("href"),
    ).toBe("/app/new");
    expect(
      screen.getByAltText(
        "Droplet assistant visual with floating chat and media creation elements",
      ),
    ).toBeTruthy();
  });
});
