/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import ChatSidebar from "@/components/chat/sidebar/ChatSidebar";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import { getRecentTasksByUserId } from "@/lib/utils/task-queries";
import { createTestUser, mockAuth } from "../test-support";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
}));

vi.mock("@/lib/utils/effective-promo-content", () => ({
  getEffectivePromoContent: vi.fn(),
}));

vi.mock("@/lib/utils/effective-persona-config", () => ({
  getEffectivePersonaConfig: vi.fn(),
  getPersonaFromConfig: vi.fn(),
}));

vi.mock("@/lib/utils/task-queries", () => ({
  getRecentTasksByUserId: vi.fn(),
}));

vi.mock("@/components/chat/sidebar/ChatSidebarWrapper", () => ({
  default: ({
    historyItems,
    isHistoryUnavailable,
  }: {
    historyItems: Array<unknown>;
    isHistoryUnavailable?: boolean;
  }) => (
    <div
      data-testid="chat-sidebar-wrapper"
      data-history-count={historyItems.length}
      data-history-unavailable={String(Boolean(isHistoryUnavailable))}
    />
  ),
}));

describe("ChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(vi.mocked(auth), {
      userId: "user_sidebar_1",
      isAuthenticated: true,
      sessionId: "session_sidebar_1",
    });
    vi.mocked(getEffectivePromoContent).mockResolvedValue({} as never);
    vi.mocked(getEffectivePersonaConfig).mockResolvedValue([]);
  });

  it("skips task history queries when user sync fails", async () => {
    vi.mocked(ensureUserSynced).mockResolvedValue(null);

    render(await ChatSidebar());

    expect(getRecentTasksByUserId).not.toHaveBeenCalled();
    expect(
      screen
        .getByTestId("chat-sidebar-wrapper")
        .getAttribute("data-history-unavailable"),
    ).toBe("true");
  });

  it("marks history unavailable when the recent task query fails", async () => {
    vi.mocked(ensureUserSynced).mockResolvedValue(createTestUser());
    vi.mocked(getRecentTasksByUserId).mockRejectedValue(
      new Error("querySrv ECONNREFUSED"),
    );

    render(await ChatSidebar());

    expect(getRecentTasksByUserId).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByTestId("chat-sidebar-wrapper")
        .getAttribute("data-history-unavailable"),
    ).toBe("true");
  });
});
