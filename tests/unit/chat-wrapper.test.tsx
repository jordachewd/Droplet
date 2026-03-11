/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Message } from "@/types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ChatWrapper from "@/components/chat/chat-wrapper";

vi.mock("@/components/chat/chat-header", () => ({
  default: () => <div data-testid="chat-header" />,
}));

vi.mock("@/components/chat/chat-intro", () => ({
  default: () => <div data-testid="chat-intro" />,
}));

vi.mock("@/components/chat/chat-body", () => ({
  default: ({
    conversationEnded,
    endState,
  }: {
    conversationEnded?: boolean;
    endState?: { stopReason: string; endAction: string } | null;
  }) => (
    <div data-testid="chat-body">
      {conversationEnded ? "ended" : "active"}
      {endState ? `:${endState.stopReason}:${endState.endAction}` : ""}
    </div>
  ),
}));

vi.mock("@/components/chat/chat-input", () => ({
  default: ({
    sendMessage,
    disabled,
  }: {
    sendMessage: (prompt: Message) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        sendMessage({
          whois: "user",
          role: "user",
          content: [{ type: "text", text: "hello" }],
        })
      }
    >
      Send message
    </button>
  ),
}));

vi.mock("@/components/shared/alert-message", () => ({
  default: ({ message }: { message: { title: string; text?: string } }) => (
    <div role="alert">
      {message.title}: {message.text}
    </div>
  ),
}));

vi.mock("@/lib/utils/openai/filterAssistantMsg", () => ({
  filterAssistantMsg: (messages: Message[]) => messages,
}));

describe("ChatWrapper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows API error payload text for non-200 responses", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Your plan has expired. Please upgrade to continue.",
        }),
        {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<ChatWrapper />);

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toContain("Forbidden");
    expect(screen.getByRole("alert").textContent).toContain(
      "Your plan has expired. Please upgrade to continue.",
    );
  });

  it("renders stop payloads and disables input when the conversation is ended", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Stop here." }],
          },
          stopReason: "prompt_limit_reached",
          endAction: "start_new_conversation",
          taskStatus: "ended",
          acceptedPrompt: false,
        }),
        {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <ChatWrapper
        initialMessages={[{ role: "user", whois: "user", content: "prior" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByTestId("chat-body").textContent).toContain(
        "ended:prompt_limit_reached:start_new_conversation",
      );
    });

    expect(
      screen
        .getByRole("button", { name: "Send message" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
