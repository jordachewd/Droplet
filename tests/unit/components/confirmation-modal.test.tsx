/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmationModal from "@/components/shared/confirmation-modal";

describe("ConfirmationModal", () => {
  it("does not render when closed", () => {
    render(
      <ConfirmationModal
        isOpen={false}
        title="Delete item"
        description="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls confirm and cancel handlers from action buttons", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen
        title="Delete item"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls cancel when Escape is pressed", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen
        title="Delete item"
        description="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls cancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmationModal
        isOpen
        title="Delete item"
        description="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const backdrop = container.querySelector(".ConfirmationModal");
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop as HTMLElement);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
