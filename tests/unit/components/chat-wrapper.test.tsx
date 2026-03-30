/** @vitest-environment jsdom */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Message } from "@/types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ChatWrapper from "@/components/chat/chat-wrapper";
import { PERSONAS } from "@/constants/assistant-personas";
import { STOP_REASON_MESSAGES } from "@/constants/stop-reasons";

vi.mock("@/components/chat/chat-header", () => ({
  default: () => <div data-testid="chat-header" />,
}));

vi.mock("@/components/chat/chat-intro", () => ({
  default: () => <div data-testid="chat-intro" />,
}));

vi.mock("@/components/chat/chat-body", () => ({
  default: ({
    messages,
    conversationEnded,
    endState,
  }: {
    messages?: Message[];
    conversationEnded?: boolean;
    endState?: { stopReason: string; endAction: string } | null;
  }) => (
    <div data-testid="chat-body">
      {conversationEnded ? "ended" : "active"}
      {endState ? `:${endState.stopReason}:${endState.endAction}` : ""}
      <div data-testid="chat-body-messages">
        {messages
          ?.map((message) =>
            Array.isArray(message.content)
              ? message.content
                  .map((item) => item.text ?? item.image_url?.url ?? "")
                  .join(" ")
              : message.content,
          )
          .join(" | ")}
      </div>
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
  const chatWrapperProps = {
    personas: PERSONAS,
    supportEmail: "support@example.com",
    stopReasonMessages: STOP_REASON_MESSAGES,
  };

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

    render(<ChatWrapper {...chatWrapperProps} />);

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
        {...chatWrapperProps}
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

  it("keeps the conversation active for non-terminal media stop payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [
              {
                type: "text",
                text: "You've reached your video generation limit for this billing period. You can continue chatting. Start a new conversation to keep going.",
              },
            ],
          },
          stopReason: "video_limit_reached",
          endAction: "start_new_conversation",
          taskStatus: "active",
          acceptedPrompt: true,
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
        {...chatWrapperProps}
        initialMessages={[{ role: "user", whois: "user", content: "prior" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByTestId("chat-body").textContent).toContain("active");
    });

    expect(screen.getByTestId("chat-body").textContent).not.toContain("ended");
    expect(screen.getByTestId("chat-body-messages").textContent).toContain(
      "You've reached your video generation limit for this billing period.",
    );
    expect(
      screen
        .getByRole("button", { name: "Send message" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a generic alert when the chat request fails before a response returns", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));

    render(<ChatWrapper {...chatWrapperProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Unable to send your message right now.",
      );
    });
  });

  it("renders streamed assistant text incrementally and finalizes the response", async () => {
    const stream = new ReadableStream({
      start(controller: ReadableStreamDefaultController<Uint8Array>) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"meta","taskId":"task_stream","personaId":"strategist"}\n\n',
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"chunk","delta":"Hello","snapshot":"Hello"}\n\n',
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"final","payload":{"taskData":{"whois":"assistant","role":"assistant","content":[{"type":"text","text":"Hello from stream"}]},"taskId":"task_stream","personaId":"strategist","acceptedPrompt":true}}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    render(<ChatWrapper {...chatWrapperProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByTestId("chat-body-messages").textContent).toContain(
        "Hello",
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-body-messages").textContent).toContain(
        "Hello from stream",
      );
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps long streams alive when heartbeat events are received", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      let streamController: ReadableStreamDefaultController<Uint8Array> | null =
        null;
      const signal = init?.signal as AbortSignal;

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;

          controller.enqueue(
            new TextEncoder().encode(
              'data: {"type":"meta","taskId":"task_stream_heartbeat","personaId":"strategist"}\n\n',
            ),
          );

          window.setTimeout(() => {
            controller.enqueue(
              new TextEncoder().encode('data: {"type":"heartbeat"}\n\n'),
            );
          }, 40_000);

          window.setTimeout(() => {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"final","payload":{"taskData":{"whois":"assistant","role":"assistant","content":[{"type":"text","text":"Still here after heartbeat"}]},"taskId":"task_stream_heartbeat","personaId":"strategist","acceptedPrompt":true}}\n\n',
              ),
            );
            controller.close();
          }, 100_000);
        },
      });

      signal.addEventListener(
        "abort",
        () => {
          streamController?.error(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );

      return Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    });

    try {
      render(<ChatWrapper {...chatWrapperProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Send message" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100_000);
      });

      expect(screen.getByTestId("chat-body-messages").textContent).toContain(
        "Still here after heartbeat",
      );
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a timeout alert when the request exceeds the safety timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal;

      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        signal.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    });

    try {
      render(<ChatWrapper {...chatWrapperProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Send message" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(70_000);
      });

      expect(screen.getByRole("alert").textContent).toContain(
        "The response timed out. Please try again.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes an AbortSignal to fetch and aborts in-flight requests on unmount", async () => {
    let receivedSignal: AbortSignal | undefined;

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      receivedSignal = init?.signal as AbortSignal | undefined;

      return new Promise<Response>((_resolve, reject) => {
        receivedSignal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const { unmount } = render(<ChatWrapper {...chatWrapperProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(receivedSignal).toBeDefined();
    });

    expect(receivedSignal?.aborted).toBe(false);

    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });

  it("does not show an alert when the chat request is aborted", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );

    render(<ChatWrapper {...chatWrapperProps} />);

    const sendButton = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendButton.hasAttribute("disabled")).toBe(false);
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
