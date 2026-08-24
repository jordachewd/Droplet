/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatBody from "@/components/chat/chat-body";
import { SUPPORT_EMAIL } from "@/constants/support";
import { STOP_REASON_MESSAGES } from "@/constants/stop-reasons";
import type { TaskEndAction, TaskEndedReason } from "@/types/TaskData.d";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const stopReasonCases: Array<{
  stopReason: TaskEndedReason;
  expectedTitle: string;
}> = [
  {
    stopReason: "prompt_limit_reached",
    expectedTitle: "You've reached the message limit for this conversation.",
  },
  {
    stopReason: "media_limit_reached",
    expectedTitle:
      "You've reached your media generation limit. You can continue chatting. Start a new conversation to keep going.",
  },
  {
    stopReason: "image_limit_reached",
    expectedTitle:
      "You've reached your image generation limit for this billing period. You can continue chatting. Start a new conversation to keep going.",
  },
  {
    stopReason: "audio_limit_reached",
    expectedTitle:
      "You've reached your audio generation limit for this billing period. You can continue chatting. Start a new conversation to keep going.",
  },
  {
    stopReason: "daily_conversation_limit_reached",
    expectedTitle: "You've reached the daily conversation limit for your plan.",
  },
  {
    stopReason: "conversation_storage_limit_reached",
    expectedTitle: "This conversation has reached its storage limit.",
  },
  {
    stopReason: "billing_state_invalid",
    expectedTitle: "Your plan has expired.",
  },
];

function renderChatBodyEndState(
  stopReason: TaskEndedReason,
  endAction: TaskEndAction,
) {
  return render(
    <ChatBody
      messages={[]}
      supportEmail={SUPPORT_EMAIL}
      stopReasonMessages={STOP_REASON_MESSAGES}
      endState={{ stopReason, endAction }}
    />,
  );
}

describe("ChatBody", () => {
  it.each(stopReasonCases)(
    "renders the correct stop title for $stopReason",
    ({ stopReason, expectedTitle }) => {
      renderChatBodyEndState(stopReason, "start_new_conversation");

      expect(screen.getByText("Conversation Ended")).toBeTruthy();
      expect(screen.getByText(expectedTitle)).toBeTruthy();
    },
  );

  it("links start_new_conversation to /app/new", () => {
    renderChatBodyEndState("prompt_limit_reached", "start_new_conversation");

    expect(
      screen
        .getByRole("link", { name: "Start a new conversation" })
        .getAttribute("href"),
    ).toBe("/app/new");
  });

  it("links upgrade_plan to /app/plans", () => {
    renderChatBodyEndState("billing_state_invalid", "upgrade_plan");

    expect(
      screen
        .getByRole("link", { name: "Upgrade your plan" })
        .getAttribute("href"),
    ).toBe("/app/plans");
  });

  it("links contact_support to support mailto", () => {
    renderChatBodyEndState("media_limit_reached", "contact_support");

    expect(
      screen
        .getByRole("link", { name: "Contact Support" })
        .getAttribute("href"),
    ).toBe(`mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByText(SUPPORT_EMAIL)).toBeTruthy();
  });

  it("applies amber ended-conversation styling only when end state is present", () => {
    const { container, rerender } = render(
      <ChatBody
        messages={[]}
        supportEmail={SUPPORT_EMAIL}
        stopReasonMessages={STOP_REASON_MESSAGES}
        endState={null}
      />,
    );

    const activeChatBody = container.querySelector(".ChatBody");

    expect(activeChatBody).toBeTruthy();
    expect(activeChatBody?.className.includes("border-amber-500/30")).toBe(
      false,
    );
    expect(activeChatBody?.className.includes("bg-amber-500/10")).toBe(false);

    rerender(
      <ChatBody
        messages={[]}
        supportEmail={SUPPORT_EMAIL}
        stopReasonMessages={STOP_REASON_MESSAGES}
        endState={{
          stopReason: "prompt_limit_reached",
          endAction: "start_new_conversation",
        }}
      />,
    );

    const endedChatBody = container.querySelector(".ChatBody");
    const endNotice = container.querySelector(".ChatBodyEndNotice");

    expect(endedChatBody?.className.includes("border-amber-500/30")).toBe(
      false,
    );
    expect(endedChatBody?.className.includes("bg-amber-500/10")).toBe(false);
    expect(endNotice?.className.includes("border-amber-500/30")).toBe(true);
    expect(endNotice?.className.includes("bg-amber-500/10")).toBe(true);
  });
});
