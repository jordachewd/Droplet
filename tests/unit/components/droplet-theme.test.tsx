/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DropletTheme from "@/context/droplet-theme";
import useThemeMode from "@/lib/hooks/use-theme-mode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function ThemeProbe() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved-mode">{resolvedMode}</span>
      <button type="button" onClick={() => setMode("dark")}>
        Set dark
      </button>
    </div>
  );
}

describe("DropletTheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-droplet-theme");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("defaults to system mode and resolves to light mode", async () => {
    render(
      <DropletTheme>
        <ThemeProbe />
      </DropletTheme>,
    );

    expect((await screen.findByTestId("mode")).textContent).toBe("system");
    expect((await screen.findByTestId("resolved-mode")).textContent).toBe(
      "light",
    );
    expect(document.documentElement.dataset.dropletTheme).toBe("light");
  });

  it("persists selected mode and updates html dataset", async () => {
    render(
      <DropletTheme>
        <ThemeProbe />
      </DropletTheme>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Set dark" }));

    expect((await screen.findByTestId("mode")).textContent).toBe("dark");
    expect(localStorage.getItem("droplet-theme-mode")).toBe("dark");
    expect(document.documentElement.dataset.dropletTheme).toBe("dark");
  });

  it("syncs the stored mode after mount", async () => {
    localStorage.setItem("droplet-theme-mode", "dark");

    render(
      <DropletTheme>
        <ThemeProbe />
      </DropletTheme>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mode").textContent).toBe("dark");
      expect(screen.getByTestId("resolved-mode").textContent).toBe("dark");
      expect(document.documentElement.dataset.dropletTheme).toBe("dark");
    });
  });

  it("keeps working when browser storage access is blocked", async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });

    render(
      <DropletTheme>
        <ThemeProbe />
      </DropletTheme>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Set dark" }));

    expect((await screen.findByTestId("mode")).textContent).toBe("dark");
    expect(document.documentElement.dataset.dropletTheme).toBe("dark");
    expect(getItemSpy).toHaveBeenCalledWith("droplet-theme-mode");
    expect(setItemSpy).toHaveBeenCalledWith("droplet-theme-mode", "dark");
  });
});
