/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatSidebarNav from "@/components/chat/sidebar/chat-sidebar-nav";
import { deleteTask } from "@/lib/actions/task.actions";
import { ConversationListItem } from "@/types/PersonaData.d";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  deleteTask: vi.fn(),
}));

const historyItems: ConversationListItem[] = [
  {
    id: "task_1",
    title: "Launch Roadmap",
    personaId: "strategist",
    updatedAtLabel: "2 min ago",
    href: "/app/c/task_1",
  },
];

describe("ChatSidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/app/c/task_1");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  it("deletes the active conversation and redirects to /app", async () => {
    vi.mocked(deleteTask).mockResolvedValue({
      status: 200,
      message: "Task deleted successfully",
    } as never);

    render(<ChatSidebarNav isOpen historyItems={historyItems} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Launch Roadmap" }),
    );

    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith("task_1");
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Launch Roadmap"? This cannot be undone.',
    );
    expect(replaceMock).toHaveBeenCalledWith("/app");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Launch Roadmap")).toBeNull();
  });

  it("shows an error alert and keeps the item when deletion fails", async () => {
    vi.mocked(deleteTask).mockResolvedValue({
      status: 500,
      message: "Conversation deletion failed.",
    } as never);

    render(<ChatSidebarNav isOpen historyItems={historyItems} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Launch Roadmap" }),
    );

    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith("task_1");
    });

    expect(window.alert).toHaveBeenCalledWith("Conversation deletion failed.");
    expect(screen.getByText("Launch Roadmap")).toBeTruthy();
  });
});
