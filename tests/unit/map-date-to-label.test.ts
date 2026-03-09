import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";

describe("mapDateToLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns minute labels for dates within the past hour", () => {
    const date = new Date("2026-03-09T11:45:00.000Z").toISOString();

    expect(mapDateToLabel(date)).toBe("15 min ago");
  });

  it("returns hour labels for dates within the past day", () => {
    const date = new Date("2026-03-09T08:00:00.000Z").toISOString();

    expect(mapDateToLabel(date)).toBe("4 h ago");
  });

  it("returns day labels for dates older than one day", () => {
    const date = new Date("2026-03-06T12:00:00.000Z").toISOString();

    expect(mapDateToLabel(date)).toBe("3 d ago");
  });
});
