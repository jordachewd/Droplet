import { describe, expect, it } from "vitest";
import getFullName, { getNameLetters } from "@/lib/utils/getFullName";

describe("getFullName", () => {
  it("returns full name when both first and last names are present", () => {
    expect(
      getFullName({
        firstName: "Ada",
        lastName: "Lovelace",
        username: "adal",
      }),
    ).toBe("Ada Lovelace");
  });

  it("returns first name when last name is missing", () => {
    expect(
      getFullName({
        firstName: "Ada",
        lastName: null,
        username: "adal",
      }),
    ).toBe("Ada");
  });

  it("returns last name when first name is missing", () => {
    expect(
      getFullName({
        firstName: undefined,
        lastName: "Lovelace",
        username: "adal",
      }),
    ).toBe("Lovelace");
  });

  it("falls back to username when both names are missing", () => {
    expect(
      getFullName({
        firstName: null,
        lastName: null,
        username: "adal",
      }),
    ).toBe("adal");
  });

  it("falls back to 'Y' when names and username are empty", () => {
    expect(
      getFullName({
        firstName: null,
        lastName: null,
        username: "",
      }),
    ).toBe("Y");
  });
});

describe("getNameLetters", () => {
  it("returns initials from first two name parts", () => {
    expect(getNameLetters("Ada Lovelace")).toEqual({ children: "AL" });
  });

  it("returns a single initial when name has one part", () => {
    expect(getNameLetters("Ada")).toEqual({ children: "A" });
  });
});
