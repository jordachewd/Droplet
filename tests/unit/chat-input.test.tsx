/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatInput from "@/components/chat/chat-input";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt || ""} {...props} />
  ),
}));

const fetchMock = vi.fn();
const createObjectURLMock = vi.fn(() => "blob:preview");
const revokeObjectURLMock = vi.fn();

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: createObjectURLMock,
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: revokeObjectURLMock,
});

describe("ChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes with startPrompt value", () => {
    const onSend = vi.fn();
    render(
      <ChatInput
        loading={false}
        startPrompt="Preset message"
        sendMessage={onSend}
      />,
    );

    const input = screen.getByPlaceholderText("Ask Droplet...");
    expect((input as HTMLInputElement).value).toBe("Preset message");
  });

  it("sends a user message when Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatInput loading={false} sendMessage={onSend} />);

    const input = screen.getByPlaceholderText("Ask Droplet...");
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

    const input = screen.getByPlaceholderText("Ask Droplet...");
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

  it("uploads the selected file before sending the user message", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          fileUrl: "/api/download?key=user_123%2Fuploads%2Fsample.png",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const onSend = vi.fn();
    const { container } = render(
      <ChatInput loading={false} sendMessage={onSend} />,
    );

    const input = screen.getByPlaceholderText("Ask Droplet...");
    fireEvent.change(input, { target: { value: "See this image" } });

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["image-bytes"], "sample.png", { type: "image/png" });
    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/upload", {
        method: "POST",
        body: expect.any(FormData),
      });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    const sentMessage = onSend.mock.calls[0]?.[0] as {
      content: Array<{ image_url?: { url: string } }>;
    };

    expect(onSend).toHaveBeenCalledWith({
      whois: "user",
      role: "user",
      content: [
        { type: "text", text: "See this image" },
        {
          type: "image_url",
          image_url: {
            url: "/api/download?key=user_123%2Fuploads%2Fsample.png",
          },
        },
      ],
    });
    expect(sentMessage.content[1]?.image_url?.url).not.toContain("data:image");
  });

  it("blocks message send and shows feedback when upload fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Failed to upload file." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const onSend = vi.fn();
    const { container } = render(
      <ChatInput loading={false} sendMessage={onSend} />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["image-bytes"], "sample.png", { type: "image/png" });
    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain(
        "Failed to upload file. Please try again.",
      );
    });
  });
});
