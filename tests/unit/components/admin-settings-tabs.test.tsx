/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSettingsTabs } from "@/components/admin/settings/admin-settings-tabs";

const tabs = [
  {
    id: "general",
    label: "General",
    content: <div>General settings panel</div>,
  },
  {
    id: "personas",
    label: "Personas",
    content: <div>Persona settings panel</div>,
  },
  {
    id: "models",
    label: "Models",
    content: <div>Model settings panel</div>,
  },
];

describe("AdminSettingsTabs", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders tablist semantics and marks the first tab active by default", () => {
    render(<AdminSettingsTabs tabs={tabs} />);

    const tablist = screen.getByRole("tablist", {
      name: "Admin settings sections",
    });
    const generalTab = screen.getByRole("tab", { name: "General" });

    expect(tablist).toBeTruthy();
    expect(generalTab.getAttribute("aria-selected")).toBe("true");
    expect(
      screen
        .getByRole("tabpanel")
        .textContent?.includes("General settings panel"),
    ).toBe(true);
  });

  it("restores active tab from localStorage when available", () => {
    window.localStorage.setItem(
      "droplet-admin-settings-active-tab",
      "personas",
    );

    render(<AdminSettingsTabs tabs={tabs} />);

    expect(
      screen
        .getByRole("tab", { name: "Personas" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByRole("tabpanel")
        .textContent?.includes("Persona settings panel"),
    ).toBe(true);
  });

  it("switches tabs on click and persists the new active tab id", () => {
    render(<AdminSettingsTabs tabs={tabs} />);

    fireEvent.click(screen.getByRole("tab", { name: "Models" }));

    expect(
      screen.getByRole("tab", { name: "Models" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByRole("tabpanel")
        .textContent?.includes("Model settings panel"),
    ).toBe(true);
    expect(
      window.localStorage.getItem("droplet-admin-settings-active-tab"),
    ).toBe("models");
  });

  it("supports keyboard activation for focused tabs", () => {
    render(<AdminSettingsTabs tabs={tabs} />);

    const personasTab = screen.getByRole("tab", { name: "Personas" });
    personasTab.focus();
    fireEvent.keyDown(personasTab, { key: "Enter" });
    fireEvent.click(personasTab);

    expect(personasTab.getAttribute("aria-selected")).toBe("true");
    expect(
      screen
        .getByRole("tabpanel")
        .textContent?.includes("Persona settings panel"),
    ).toBe(true);
  });

  it("implements roving tabindex and Arrow/Home/End keyboard navigation", () => {
    render(<AdminSettingsTabs tabs={tabs} />);

    const tablist = screen.getByRole("tablist", {
      name: "Admin settings sections",
    });
    const generalTab = screen.getByRole("tab", { name: "General" });
    const personasTab = screen.getByRole("tab", { name: "Personas" });
    const modelsTab = screen.getByRole("tab", { name: "Models" });

    expect(generalTab.getAttribute("tabindex")).toBe("0");
    expect(personasTab.getAttribute("tabindex")).toBe("-1");
    expect(modelsTab.getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(personasTab.getAttribute("aria-selected")).toBe("true");
    expect(personasTab.getAttribute("tabindex")).toBe("0");
    expect(generalTab.getAttribute("tabindex")).toBe("-1");
    expect(
      window.localStorage.getItem("droplet-admin-settings-active-tab"),
    ).toBe("personas");

    fireEvent.keyDown(tablist, { key: "End" });
    expect(modelsTab.getAttribute("aria-selected")).toBe("true");
    expect(modelsTab.getAttribute("tabindex")).toBe("0");
    expect(
      window.localStorage.getItem("droplet-admin-settings-active-tab"),
    ).toBe("models");

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(generalTab.getAttribute("aria-selected")).toBe("true");
    expect(generalTab.getAttribute("tabindex")).toBe("0");
    expect(
      window.localStorage.getItem("droplet-admin-settings-active-tab"),
    ).toBe("general");
  });
});
