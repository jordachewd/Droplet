/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioPlayer from "@/components/shared/audio-player";
import { useAudioStore } from "@/lib/hooks/use-audio-store";

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
    useAudioStore.setState({
      activeAudioId: null,
      audioElements: {},
    });
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
    expect(playbackButton.hasAttribute("disabled")).toBe(false);
  });

  it("allows retry after a transient play failure", async () => {
    render(<AudioPlayer audioSrc="https://cdn.example.com/sample.wav" />);

    await waitFor(() => {
      const playbackButton = screen.getByRole("button", {
        name: "Play audio playback",
      });
      expect(playbackButton.hasAttribute("disabled")).toBe(false);
    });

    const latestAudioInstance = MockAudio.instances.at(-1);
    expect(latestAudioInstance).toBeDefined();

    const playMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(undefined);
    latestAudioInstance!.play = playMock;

    fireEvent.click(
      screen.getByRole("button", {
        name: "Play audio playback",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Audio unavailable.")).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Play audio playback",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Pause audio playback",
        }),
      ).toBeTruthy();
    });

    expect(playMock).toHaveBeenCalledTimes(2);
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

  it("pauses previously active audio when another player starts", async () => {
    render(
      <>
        <AudioPlayer audioSrc="https://cdn.example.com/first.wav" />
        <AudioPlayer audioSrc="https://cdn.example.com/second.wav" />
      </>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Play audio playback" }).length,
      ).toBe(2);
    });

    const firstPlayButton = screen.getAllByRole("button", {
      name: "Play audio playback",
    })[0];
    fireEvent.click(firstPlayButton);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", {
          name: "Pause audio playback",
        }).length,
      ).toBe(1);
    });

    const secondPlayButton = screen.getAllByRole("button", {
      name: "Play audio playback",
    })[0];
    fireEvent.click(secondPlayButton);

    await waitFor(() => {
      expect(MockAudio.instances[0]?.pauseCalled).toBe(true);
      expect(
        screen.getAllByRole("button", {
          name: "Pause audio playback",
        }).length,
      ).toBe(1);
    });
  });
});
