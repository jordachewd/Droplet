/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatInput from "@/components/chat/chat-input";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt || ""} {...props} />
  ),
}));

describe("ChatInput", () => {
  it("initializes with startPrompt value", () => {
    const onSend = vi.fn();
    render(
      <ChatInput
        loading={false}
        startPrompt="Preset message"
        sendMessage={onSend}
      />,
    );

    const input = screen.getByPlaceholderText("Ask Cellesseon...");
    expect((input as HTMLInputElement).value).toBe("Preset message");
  });

  it("sends a user message when Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatInput loading={false} sendMessage={onSend} />);

    const input = screen.getByPlaceholderText("Ask Cellesseon...");
    fireEvent.change(input, { target: { value: "Hello AI" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    expect(onSend.mock.calls[0][0]).toMatchObject({
      role: "user",
      whois: "user",
      content: [{ type: "text", text: "Hello AI" }],
    });
  });

  it("does not send empty messages", async () => {
    const onSend = vi.fn();
    render(<ChatInput loading={false} sendMessage={onSend} />);

    const input = screen.getByPlaceholderText("Ask Cellesseon...");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  it("exposes a keyboard-accessible media attachment button", () => {
    const onSend = vi.fn();
    render(<ChatInput loading={false} sendMessage={onSend} />);

    const attachButton = screen.getByRole("button", { name: "Attach media" });

    expect(attachButton).toBeTruthy();
    expect(attachButton.getAttribute("type")).toBe("button");
  });
});
