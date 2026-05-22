/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PersonaCard from "@/components/shared/PersonaCard";
import type { Persona } from "@/types/PersonaData.d";

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

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => (
    <span data-testid="persona-image">{alt ?? ""}</span>
  ),
}));

const samplePersona: Persona = {
  id: "creator",
  label: "Creator",
  tagline: "Build stories and visuals quickly",
  description: "Creative partner for content, visuals, and campaigns.",
  category: "Creative",
  icon: "bi bi-brush",
  heroImage: "/images/personas/creator.png",
  starterPrompts: ["Draft a campaign brief."],
  systemPrompt: "Be practical and direct.",
  supportsImage: true,
  supportsAudio: true,
};

describe("PersonaCard", () => {
  it("renders persona details and trial badge", () => {
    render(
      <PersonaCard persona={samplePersona} trial href="/sign-up" compact />,
    );

    expect(screen.getByRole("heading", { name: "Creator" })).toBeTruthy();
    expect(screen.getByText("Build stories and visuals quickly")).toBeTruthy();
    expect(
      screen.getByText("Creative partner for content, visuals, and campaigns."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Trial access with reduced limits. Upgrade to unlock full access.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sign-up");
  });

  it("renders locked state and upgrade messaging", () => {
    render(
      <PersonaCard
        persona={samplePersona}
        locked
        requiredPlan="Premium"
        href="/app/plans"
      />,
    );

    expect(
      screen.getByText("Upgrade to Premium to unlock this persona."),
    ).toBeTruthy();
  });
});
