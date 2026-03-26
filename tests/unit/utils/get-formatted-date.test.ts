import getFormattedDate from "@/lib/utils/getFormattedDate";
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
});
