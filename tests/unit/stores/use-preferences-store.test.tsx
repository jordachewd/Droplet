/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { usePreferencesStore } from "@/lib/hooks/use-preferences-store";

const STORAGE_KEY = "droplet-user-preferences";

function resetPreferencesStoreState() {
  usePreferencesStore.setState({
    preferredPersonaId: null,
  });
}

describe("usePreferencesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPreferencesStoreState();
  });

  it("starts with no preferred persona", () => {
    expect(usePreferencesStore.getState().preferredPersonaId).toBeNull();
  });

  it("updates preferred persona through the store action", () => {
    usePreferencesStore.getState().setPreferredPersonaId("creator");

    expect(usePreferencesStore.getState().preferredPersonaId).toBe("creator");
  });

  it("persists preferred persona to localStorage", () => {
    usePreferencesStore.getState().setPreferredPersonaId("developer");

    const rawPersistedState = localStorage.getItem(STORAGE_KEY);
    expect(rawPersistedState).toBeTruthy();

    const parsedState = JSON.parse(rawPersistedState as string) as {
      state: { preferredPersonaId: string | null };
    };

    expect(parsedState.state.preferredPersonaId).toBe("developer");
  });
});
