/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import AlertMessage, { AlertParams } from "@/components/shared/alert-message";
import { describe, expect, it } from "vitest";

describe("AlertMessage", () => {
  it("shows a repeated alert payload again after dismissing the previous one", () => {
    const alertPayload: AlertParams = {
      id: 1,
      title: "Request failed",
      text: "Please retry.",
      severity: "error",
      variant: "filled",
    };
    const { rerender } = render(<AlertMessage message={alertPayload} />);

    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close alert" }));
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<AlertMessage message={{ ...alertPayload, id: 2 }} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
