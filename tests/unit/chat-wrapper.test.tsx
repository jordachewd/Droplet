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
  default: () => <div data-testid="chat-body" />,
}));

vi.mock("@/components/chat/chat-input", () => ({
  default: ({ sendMessage }: { sendMessage: (prompt: Message) => void }) => (
    <button
      type="button"
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
});
