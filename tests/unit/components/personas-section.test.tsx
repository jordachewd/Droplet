/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Persona } from "@/types/PersonaData.d";
import PersonasSection from "@/components/sections/shared/PersonasSection";

vi.mock("@/components/shared/persona-card", () => ({
  default: ({
    persona,
    href,
    locked,
    trial,
    requiredPlan,
  }: {
    persona: Persona;
    href: string;
    locked: boolean;
    trial: boolean;
    requiredPlan?: string | null;
  }) => (
    <a
      href={href}
      data-testid={`persona-${persona.id}`}
      data-locked={locked ? "true" : "false"}
      data-trial={trial ? "true" : "false"}
      data-required-plan={requiredPlan ?? ""}
    >
      {persona.label}
    </a>
  ),
}));

const personas: Persona[] = [
  {
    id: "strategist",
    label: "Strategist",
    tagline: "Plan with clarity",
    description: "Strategic planning",
    category: "Productivity",
    icon: "bi bi-lightning",
    heroImage: "/images/strategist.png",
    starterPrompts: ["Prompt"],
    systemPrompt: "System prompt",
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "teacher",
    label: "Teacher",
    tagline: "Learn effectively",
    description: "Education support",
    category: "Learning",
    icon: "bi bi-book",
    heroImage: "/images/teacher.png",
    starterPrompts: ["Prompt"],
    systemPrompt: "System prompt",
    supportsImage: true,
    supportsAudio: true,
  },
];

describe("PersonasSection", () => {
  it("renders public mode cards with sign-up links", () => {
    render(<PersonasSection personas={personas} />);

    expect(screen.getByTestId("persona-strategist").getAttribute("href")).toBe(
      "/sign-up",
    );
    expect(screen.getByTestId("persona-teacher").getAttribute("href")).toBe(
      "/sign-up",
    );
  });

  it("routes locked app-mode personas to plans page", () => {
    render(
      <PersonasSection
        personas={personas}
        isAppMode
        allowedPersonaIds={["strategist"]}
      />,
    );

    expect(screen.getByTestId("persona-strategist").getAttribute("href")).toBe(
      "/app?persona=strategist",
    );
    expect(
      screen.getByTestId("persona-strategist").getAttribute("data-locked"),
    ).toBe("false");
    expect(screen.getByTestId("persona-teacher").getAttribute("href")).toBe(
      "/app/plans",
    );
    expect(
      screen.getByTestId("persona-teacher").getAttribute("data-locked"),
    ).toBe("true");
  });

  it("omits locked personas when configured to hide them", () => {
    render(
      <PersonasSection
        personas={personas}
        isAppMode
        allowedPersonaIds={["strategist"]}
        showLockedPersonas={false}
      />,
    );

    expect(screen.getByTestId("persona-strategist")).toBeTruthy();
    expect(screen.queryByTestId("persona-teacher")).toBeNull();
  });

  it("passes trial and required plan metadata to persona cards", () => {
    render(
      <PersonasSection
        personas={personas}
        isAppMode
        allowedPersonaIds={["strategist", "teacher"]}
        personaAccess={{ teacher: "limited" }}
        personaRequiredPlan={{ teacher: "Pro" }}
      />,
    );

    const teacherCard = screen.getByTestId("persona-teacher");

    expect(teacherCard.getAttribute("data-trial")).toBe("true");
    expect(teacherCard.getAttribute("data-required-plan")).toBe("Pro");
  });
});
