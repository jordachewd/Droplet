/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Faqs from "@/components/sections/shared/FaqsSection";

const sampleFaqs = [
  {
    id: 1,
    question: "How do plan limits work?",
    answer: "Plan limits reset per usage window.",
  },
  {
    id: 2,
    question: "Can I change my plan later?",
    answer: "Yes. You can change plans from the plans page.",
  },
];

describe("Faqs section", () => {
  it("renders FAQ heading and all provided question items", () => {
    render(<Faqs faqsData={sampleFaqs} />);

    expect(
      screen.getByRole("heading", { name: "Frequently Asked Questions" }),
    ).toBeTruthy();
    expect(screen.getByText("How do plan limits work?")).toBeTruthy();
    expect(screen.getByText("Can I change my plan later?")).toBeTruthy();
  });

  it("binds summary controls to answer panels", () => {
    render(<Faqs faqsData={sampleFaqs} />);

    const firstSummary = screen
      .getByText("How do plan limits work?")
      .closest("summary");

    expect(firstSummary).toBeTruthy();
    expect(firstSummary?.getAttribute("aria-controls")).toBe("panel1-content");
    expect(firstSummary?.getAttribute("id")).toBe("panel1-header");

    fireEvent.click(firstSummary as HTMLElement);
    expect(
      screen.getByText("Plan limits reset per usage window."),
    ).toBeTruthy();
  });
});
