import { describe, expect, it } from "vitest";
import getFullName, { getNameLetters } from "@/lib/utils/getFullName";

describe("getFullName", () => {
  it("returns first and last name when both are provided", () => {
    expect(
      getFullName({
        firstName: "Ada",
        lastName: "Lovelace",
        username: "adal",
      }),
    ).toBe("Ada Lovelace");
  });

  it("falls back to username when names are missing", () => {
    expect(
      getFullName({
        username: "codex-user",
      }),
    ).toBe("codex-user");
  });
});

describe("getNameLetters", () => {
  it("returns initials for multi-part names", () => {
    expect(getNameLetters("Ada Lovelace")).toEqual({ children: "AL" });
  });

  it("returns single initial for single-part names", () => {
    expect(getNameLetters("Ada")).toEqual({ children: "A" });
  });
});
