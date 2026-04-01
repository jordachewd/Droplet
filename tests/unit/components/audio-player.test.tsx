/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioPlayer from "@/components/shared/audio-player";

vi.mock("@/lib/utils/aws/s3-file-reference", () => ({
  resolveStoredAssetUrl: (value: string) => value,
}));

type Listener = () => void;

class MockAudio {
  static instances: MockAudio[] = [];

  src = "";
  currentTime = 0;
  duration = 120;
  pauseCalled = false;
  onloadedmetadata: Listener | null = null;
  private listeners = new Map<string, Set<Listener>>();

  constructor(src?: string) {
    this.src = src ?? "";
    MockAudio.instances.push(this);
    queueMicrotask(() => {
      this.onloadedmetadata?.();
    });
  }

  play() {
    return Promise.resolve();
  }

  pause() {
    this.pauseCalled = true;
  }

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

  emit(eventName: string) {
    const listenersForEvent = this.listeners.get(eventName);

    if (!listenersForEvent) {
      return;
    }

    for (const listener of listenersForEvent) {
      listener();
    }
  }
}

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.stubGlobal("Audio", MockAudio as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    MockAudio.instances = [];
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

  it("shows an error state when audio loading fails", async () => {
    render(<AudioPlayer audioSrc="https://cdn.example.com/sample.wav" />);

    await waitFor(() => {
      const playbackButton = screen.getByRole("button", {
        name: "Play audio playback",
      });
      expect(playbackButton.hasAttribute("disabled")).toBe(false);
    });

    const latestAudioInstance = MockAudio.instances.at(-1);
    expect(latestAudioInstance).toBeDefined();
    latestAudioInstance?.emit("error");

    await waitFor(() => {
      expect(screen.getByText("Audio unavailable.")).toBeTruthy();
    });

    const playbackButton = screen.getByRole("button", {
      name: "Play audio playback",
    });
    expect(playbackButton.hasAttribute("disabled")).toBe(true);
  });

  it("releases the audio source during cleanup", async () => {
    const { unmount } = render(
      <AudioPlayer audioSrc="https://cdn.example.com/sample.wav" />,
    );

    await waitFor(() => {
      const playbackButton = screen.getByRole("button", {
        name: "Play audio playback",
      });
      expect(playbackButton.hasAttribute("disabled")).toBe(false);
    });

    const latestAudioInstance = MockAudio.instances.at(-1);
    expect(latestAudioInstance).toBeDefined();

    unmount();

    expect(latestAudioInstance?.pauseCalled).toBe(true);
    expect(latestAudioInstance?.src).toBe("");
  });
});
