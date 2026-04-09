/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppLayoutShell from "@/components/shared/app-layout-shell";

describe("AppLayoutShell", () => {
  it("renders skip link, slots, and main content", () => {
    render(
      <AppLayoutShell
        mainId="chat-main-content"
        sidebar={<aside>Sidebar content</aside>}
        header={<header>Header content</header>}
      >
        <p>Main content</p>
      </AppLayoutShell>,
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink.getAttribute("href")).toBe("#chat-main-content");
    expect(screen.getByText("Sidebar content")).toBeTruthy();
    expect(screen.getByText("Header content")).toBeTruthy();
    expect(screen.getByText("Main content")).toBeTruthy();
    expect(document.getElementById("chat-main-content")).toBeTruthy();
  });

  it("uses a custom skip-link target when provided", () => {
    render(
      <AppLayoutShell
        mainId="admin-main-content"
        skipLinkTarget="custom-main"
        sidebar={<aside>Sidebar content</aside>}
        header={<header>Header content</header>}
      >
        <p>Main content</p>
      </AppLayoutShell>,
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink.getAttribute("href")).toBe("#custom-main");
    expect(document.getElementById("admin-main-content")).toBeTruthy();
  });
});
