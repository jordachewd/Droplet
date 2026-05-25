/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChatSidebarPromo from "@/components/chat/sidebar/ChatSidebarPromo";

describe("ChatSidebarPromo", () => {
  it("shows the upgrade CTA for non-suspended client users", () => {
    render(
      <ChatSidebarPromo
        planName="Lite"
        userRole="client"
        isSuspended={false}
      />,
    );

    expect(screen.getByText("Go Pro")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upgrade" })).toBeTruthy();
  });

  it("shows a suspension message and hides upgrade CTA for suspended users", () => {
    render(<ChatSidebarPromo planName="Lite" userRole="client" isSuspended />);

    expect(screen.getByText("Account Suspended")).toBeTruthy();
    expect(
      screen.getByText(
        "Your account has been suspended. Contact support for assistance.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Upgrade Now" })).toBeNull();
  });

  it('renders "ADMIN" label for admin users', () => {
    render(<ChatSidebarPromo planName="Lite" userRole="admin" />);

    expect(screen.getByText("ADMIN")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Upgrade Now" })).toBeNull();
  });
});
