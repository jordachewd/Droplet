/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ChatLayout from "@/app/(chat)/layout";
import ChatPage from "@/app/(chat)/app/page";
import NewConversationPage from "@/app/(chat)/app/new/page";
import SettingsPage from "@/app/(chat)/app/settings/page";
import OnboardingPage from "@/app/(chat)/app/onboarding/page";
import ConversationPage from "@/app/(chat)/app/c/[conversationId]/page";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { mockAuth } from "../test-support";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
}));

vi.mock("@/lib/utils/task-queries", () => ({
  getTaskByIdForUser: vi.fn(),
}));

vi.mock("@/components/shared/ChatAccountLoadErrorState", () => ({
  default: ({
    retryHref,
    containerClassName,
  }: {
    retryHref: string;
    containerClassName?: string;
  }) => (
    <div
      data-testid="chat-account-load-error"
      data-retry-href={retryHref}
      data-container-class={containerClassName ?? ""}
    >
      Account load error
    </div>
  ),
}));

vi.mock("@/components/chat/chat-wrapper", () => ({
  default: () => <div>Chat wrapper</div>,
}));

vi.mock("@/components/chat/chat-header", () => ({
  default: () => <div>Chat header</div>,
}));

vi.mock("@/components/chat/sidebar/ChatSidebar", () => ({
  default: () => <div>Chat sidebar</div>,
}));

vi.mock("@/components/chat/ChatLayoutWrapper", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/chat/settings/settings-form", () => ({
  default: () => <div>Settings form</div>,
}));

vi.mock("@/components/chat/onboarding/onboarding-wizard", () => ({
  default: () => <div>Onboarding wizard</div>,
}));

async function renderServerComponent(node: Promise<ReactNode> | ReactNode) {
  render(await node);
}

describe("authenticated chat route account-load handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(vi.mocked(auth), {
      userId: "user_route_1",
      isAuthenticated: true,
      sessionId: "session_route_1",
    });
    headersMock.mockResolvedValue({
      get: (name: string) => (name === "x-next-pathname" ? "/app" : null),
    });
    vi.mocked(ensureUserSynced).mockResolvedValue(null);
  });

  it("renders account-load UI from the shared chat layout", async () => {
    await renderServerComponent(
      ChatLayout({ children: <div>Protected content</div> }),
    );

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(
      screen
        .getByTestId("chat-account-load-error")
        .getAttribute("data-retry-href"),
    ).toBe("/app");
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders account-load UI on the main chat page instead of notFound", async () => {
    await renderServerComponent(
      ChatPage({ searchParams: Promise.resolve({}) }),
    );

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders account-load UI on the new conversation route", async () => {
    await renderServerComponent(NewConversationPage());

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders account-load UI on the settings route", async () => {
    await renderServerComponent(SettingsPage());

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders account-load UI on the onboarding route", async () => {
    await renderServerComponent(OnboardingPage());

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders account-load UI before loading a conversation task", async () => {
    await renderServerComponent(
      ConversationPage({
        params: Promise.resolve({ conversationId: "task_123" }),
      }),
    );

    expect(screen.getByTestId("chat-account-load-error")).toBeTruthy();
    expect(getTaskByIdForUser).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });
});
