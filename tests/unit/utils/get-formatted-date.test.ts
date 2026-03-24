import getFormattedDate, {
  getExpirationCountDown,
  isTimeUp,
} from "@/lib/utils/getFormattedDate";
import { describe, expect, it } from "vitest";
import { createTestUser } from "../test-support";

describe("get-formatted-date", () => {
  it("returns N/A for invalid inputs", () => {
    expect(getFormattedDate(null)).toBe("N/A");
    expect(getFormattedDate("")).toBe("N/A");
    expect(getFormattedDate("not-a-date")).toBe("N/A");
  });

  it("formats valid date values", () => {
    const user = createTestUser();
    const value = getFormattedDate(user.registerAt);

    expect(value).not.toBe("N/A");
    expect(typeof value).toBe("string");
  });

  it("calculates expiration countdown and rejects invalid dates", () => {
    const user = createTestUser();
    const countdown = getExpirationCountDown(
      new Date(user.registerAt),
      new Date(user.plan.expiresOn),
    );

    expect(Object.keys(countdown).length).toBeGreaterThan(0);
    expect(() =>
      getExpirationCountDown("invalid" as unknown as Date, new Date()),
    ).toThrow("startDate");
    expect(() =>
      getExpirationCountDown(new Date(), "invalid" as unknown as Date),
    ).toThrow("endDate");
  });

  it("returns whether expiration time has passed", () => {
    expect(isTimeUp(new Date(Date.now() - 1_000))).toBe(true);
    expect(isTimeUp(new Date(Date.now() + 60_000))).toBe(false);
  });
});
