import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/lib/hooks/use-ui-store";

function resetUiStoreState() {
  useUiStore.setState({
    desktopSidebarCollapsed: false,
    mobileSidebarOpen: false,
    themeMode: "system",
  });
}

describe("useUiStore", () => {
  beforeEach(() => {
    resetUiStoreState();
  });

  it("starts with the expected initial state", () => {
    const state = useUiStore.getState();

    expect(state.desktopSidebarCollapsed).toBe(false);
    expect(state.mobileSidebarOpen).toBe(false);
    expect(state.themeMode).toBe("system");
  });

  it("toggles desktop sidebar collapsed state", () => {
    useUiStore.getState().toggleDesktopSidebarCollapsed();
    expect(useUiStore.getState().desktopSidebarCollapsed).toBe(true);

    useUiStore.getState().toggleDesktopSidebarCollapsed();
    expect(useUiStore.getState().desktopSidebarCollapsed).toBe(false);
  });

  it("sets and toggles mobile sidebar state", () => {
    useUiStore.getState().setMobileSidebarOpen(true);
    expect(useUiStore.getState().mobileSidebarOpen).toBe(true);

    useUiStore.getState().toggleMobileSidebarOpen();
    expect(useUiStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("updates theme mode", () => {
    useUiStore.getState().setThemeMode("dark");
    expect(useUiStore.getState().themeMode).toBe("dark");

    useUiStore.getState().setThemeMode("light");
    expect(useUiStore.getState().themeMode).toBe("light");
  });
});
