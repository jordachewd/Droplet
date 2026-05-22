/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "@/components/shared/Button";

describe("Button", () => {
  it("renders with default classes and type", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });

    expect(button.className).toContain("Button");
    expect(button.className).toContain("btn");
    expect(button.className).toContain("btn-sm");
    expect(button.className).toContain("btn-contained");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-busy")).toBe("false");
  });

  it("applies explicit variant, size, className, and type", () => {
    render(
      <Button
        variant="outlined"
        size="sm"
        className="custom-class"
        type="submit"
      >
        Submit
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Submit" });

    expect(button.className).toContain("btn-sm");
    expect(button.className).toContain("btn-outlined");
    expect(button.className).toContain("custom-class");
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("shows loading state and disables interactions", () => {
    const onClick = vi.fn();

    render(
      <Button loading onClick={onClick}>
        Processing...
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Processing..." });
    const loader = button.querySelector(".LoadingBubbles");

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("disabled")).not.toBeNull();
    expect(loader).toBeTruthy();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects disabled prop when not loading", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button.getAttribute("disabled")).not.toBeNull();
  });
});
