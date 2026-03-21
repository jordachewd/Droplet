import { describe, expect, it } from "vitest";
import { generateString } from "@/lib/utils/generateString";

describe("generateString", () => {
  it("uses default length when no size is provided", () => {
    const value = generateString();

    expect(value).toHaveLength(16);
  });

  it("uses requested length", () => {
    const value = generateString(32);

    expect(value).toHaveLength(32);
  });

  it("produces non-identical values across invocations", () => {
    const valueA = generateString(32);
    const valueB = generateString(32);

    expect(valueA).not.toBe(valueB);
  });

  it("uses only URL-safe alphanumeric characters", () => {
    const value = generateString(64);

    expect(value).toMatch(/^[A-Za-z0-9]+$/);
  });
});
