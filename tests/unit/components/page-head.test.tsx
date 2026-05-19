/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHead from "@/components/layout/PageHead";

describe("PageHead", () => {
  it("renders an h1 heading by default", () => {
    render(
      <PageHead title="Choose your plan" subtitle="Pick the best option." />,
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Choose your plan",
    });

    expect(heading.tagName).toBe("H1");
    expect(screen.getByText("Pick the best option.")).toBeTruthy();
  });

  it("renders an h2 heading when headingLevel is h2", () => {
    render(<PageHead title="Frequently Asked Questions" headingLevel="h2" />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Frequently Asked Questions",
    });

    expect(heading.tagName).toBe("H2");
    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: "Frequently Asked Questions",
      }),
    ).toBeNull();
  });

  it("renders an h3 heading when headingLevel is h3", () => {
    render(<PageHead title="Need more help?" headingLevel="h3" />);

    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Need more help?",
    });

    expect(heading.tagName).toBe("H3");
  });
});
