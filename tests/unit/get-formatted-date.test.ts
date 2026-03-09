import { describe, expect, it } from "vitest";
import getFormattedDate, {
  getExpirationCountDown,
  isTimeUp,
} from "@/lib/utils/getFormattedDate";

describe("getFormattedDate utilities", () => {
  it("formats date values into en-GB date/time output", () => {
    const value = getFormattedDate("2026-03-05T14:45:00.000Z");

    expect(value).toContain("5 Mar 2026");
  });

  it("throws when date is missing", () => {
    expect(() => getFormattedDate("" as never)).toThrow(
      "Date is undefined in getFormattedDate()!",
    );
  });

  it("throws on invalid start and end dates for countdown", () => {
    expect(() =>
      getExpirationCountDown("invalid" as never, new Date()),
    ).toThrow("Expiration startDate is not a valid Date object");

    expect(() =>
      getExpirationCountDown(new Date(), "invalid" as never),
    ).toThrow("Expiration endDate is not a valid Date object");
  });

  it("returns expected countdown parts for valid dates", () => {
    const start = new Date("2026-03-05T10:00:00.000Z");
    const end = new Date("2026-03-07T13:04:05.000Z");

    const result = getExpirationCountDown(start, end);

    expect(result).toMatchObject({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("reports whether an end date is already reached", () => {
    expect(isTimeUp(new Date(Date.now() - 1_000))).toBe(true);
    expect(isTimeUp(new Date(Date.now() + 60_000))).toBe(false);
  });
});
