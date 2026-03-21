/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioPlayer from "@/components/shared/audio-player";

vi.mock("@/lib/utils/aws/s3-file-reference", () => ({
  resolveStoredAssetUrl: (value: string) => value,
}));

type Listener = () => void;

class MockAudio {
  currentTime = 0;
  duration = 120;
  onloadedmetadata: Listener | null = null;
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    queueMicrotask(() => {
      this.onloadedmetadata?.();
    });
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  addEventListener(eventName: string, listener: Listener) {
    const listenersForEvent = this.listeners.get(eventName) ?? new Set();
    listenersForEvent.add(listener);
    this.listeners.set(eventName, listenersForEvent);
  }

  removeEventListener(eventName: string, listener: Listener) {
    const listenersForEvent = this.listeners.get(eventName);

    if (!listenersForEvent) {
      return;
    }

    listenersForEvent.delete(listener);
  }
}

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.stubGlobal("Audio", MockAudio as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders accessible controls with disabled playback when no source is provided", () => {
    render(<AudioPlayer audioSrc={null} />);

    const playbackButton = screen.getByRole("button", {
      name: "Play audio playback",
    });
    const progressbar = screen.getByRole("progressbar", {
      name: "Audio playback progress",
    });

    expect(playbackButton.hasAttribute("disabled")).toBe(true);
    expect(progressbar.getAttribute("aria-valuenow")).toBe("0");
    expect(progressbar.getAttribute("aria-valuetext")).toBe("0:00 of 0:00");
  });

  it("enables playback and updates accessible labels when source exists", async () => {
    render(<AudioPlayer audioSrc="https://cdn.example.com/sample.wav" />);

    const playbackButton = screen.getByRole("button", {
      name: "Play audio playback",
    });

    await waitFor(() => {
      expect(playbackButton.hasAttribute("disabled")).toBe(false);
    });

    fireEvent.click(playbackButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Pause audio playback",
        }),
      ).toBeTruthy();
    });

    const progressbar = screen.getByRole("progressbar", {
      name: "Audio playback progress",
    });
    expect(progressbar.getAttribute("aria-valuetext")).toContain("of 2:00");
  });
});
