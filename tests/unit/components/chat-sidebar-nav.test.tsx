/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatSidebarNav from "@/components/chat/sidebar/ChatSidebarNav";
import { ConversationListItem } from "@/types/PersonaData.d";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/app"));
const refreshMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    refresh: refreshMock,
    replace: replaceMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  deleteTask: vi.fn(),
  renameTask: vi.fn(),
}));

function createConversationItem(
  overrides: Partial<ConversationListItem>,
): ConversationListItem {
  return {
    id: "conversation-1",
    title: "Original strategy notes",
    personaId: "strategist",
    personaLabel: "Strategist",
    personaIcon: "bi bi-compass",
    updatedAtLabel: "Today",
    href: "/app/c/conversation-1",
    ...overrides,
  };
}

describe("ChatSidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/app");
  });

  it("updates recent conversations when server-provided history changes", () => {
    const initialHistory = [
      createConversationItem({
        id: "conversation-1",
        title: "Original strategy notes",
        href: "/app/c/conversation-1",
      }),
    ];
    const updatedHistory = [
      createConversationItem({
        id: "conversation-2",
        title: "Updated launch plan",
        href: "/app/c/conversation-2",
      }),
    ];

    const { rerender } = render(
      <ChatSidebarNav isOpen historyItems={initialHistory} />,
    );

    expect(
      screen.getByRole("link", {
        name: "Original strategy notes conversation",
      }),
    ).toBeTruthy();

    rerender(<ChatSidebarNav isOpen historyItems={updatedHistory} />);

    expect(
      screen.queryByRole("link", {
        name: "Original strategy notes conversation",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Updated launch plan conversation" }),
    ).toBeTruthy();
  });

  it("renders unavailable messaging when recent conversations cannot be loaded", () => {
    render(<ChatSidebarNav isOpen historyItems={[]} isHistoryUnavailable />);

    expect(
      screen.getByText(
        "Recent conversations are temporarily unavailable. Please retry shortly.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("No saved conversations yet.")).toBeNull();
  });
});
