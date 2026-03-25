import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapDateToLabel } from "@/lib/utils/map-date-to-label";

describe("map-date-to-label", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for empty or invalid dates", () => {
    expect(mapDateToLabel("")).toBe("");
    expect(mapDateToLabel("invalid")).toBe("");
  });

  it("returns at least 1 minute for very recent timestamps", () => {
    expect(mapDateToLabel("2026-03-25T12:00:00.000Z")).toBe("1 min ago");
  });

  it("returns minutes when the difference is less than one hour", () => {
    expect(mapDateToLabel("2026-03-25T11:31:00.000Z")).toBe("29 min ago");
  });

  it("returns hours when the difference is less than one day", () => {
    expect(mapDateToLabel("2026-03-25T09:00:00.000Z")).toBe("3 h ago");
  });

  it("returns days when the difference is one day or more", () => {
    expect(mapDateToLabel("2026-03-22T12:00:00.000Z")).toBe("3 d ago");
  });
});
