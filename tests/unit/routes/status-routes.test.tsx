/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import UnauthorizedPage from "@/app/401/page";
import ForbiddenPage from "@/app/403/page";
import InternalServerErrorPage from "@/app/500/page";
import NotFoundPage from "@/app/not-found";

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

describe("status routes", () => {
  it("renders /401 with sign-in call to action", () => {
    render(<UnauthorizedPage />);

    expect(screen.getByText("HTTP 401")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Unauthorized" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Go to Sign In" }).getAttribute("href"),
    ).toBe("/sign-in");
  });

  it("renders /403 with home call to action", () => {
    render(<ForbiddenPage />);

    expect(screen.getByText("HTTP 403")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Forbidden" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Go Home" }).getAttribute("href"),
    ).toBe("/");
  });

  it("renders /500 with retry guidance", () => {
    render(<InternalServerErrorPage />);

    expect(screen.getByText("HTTP 500")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Server Error" })).toBeTruthy();
    expect(
      screen.getByText(
        "Please try again in a few moments. If the issue persists, contact support.",
      ),
    ).toBeTruthy();
  });

  it("renders not-found page with home call to action", () => {
    render(<NotFoundPage />);

    expect(screen.getByText("HTTP 404")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Page Not Found" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Go Home" }).getAttribute("href"),
    ).toBe("/");
  });
});
