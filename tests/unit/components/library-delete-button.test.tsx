/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LibraryDeleteButton from "@/components/chat/library-delete-button";
import { deleteTask } from "@/lib/actions/task.actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  deleteTask: vi.fn(),
}));

describe("LibraryDeleteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  it("deletes the conversation and refreshes the library route", async () => {
    vi.mocked(deleteTask).mockResolvedValue({
      status: 200,
      message: "Task deleted successfully",
    } as never);

    render(
      <LibraryDeleteButton
        conversationId="task_99"
        conversationTitle="Investor Notes"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Investor Notes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith("task_99");
    });

    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("does not call deleteTask when the user cancels the confirmation", () => {
    render(
      <LibraryDeleteButton
        conversationId="task_99"
        conversationTitle="Investor Notes"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Investor Notes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteTask).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
