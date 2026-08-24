import { describe, expect, it } from "vitest";
import {
  isMongoDuplicateKeyError,
  isObjectRecord,
} from "@/lib/utils/type-guards";
import { createTestUser } from "../test-support";

describe("type-guards", () => {
  it("detects plain object records", () => {
    const user = createTestUser();

    expect(isObjectRecord(user)).toBe(true);
    expect(isObjectRecord(["not", "record"])).toBe(false);
    expect(isObjectRecord(null)).toBe(false);
    expect(isObjectRecord("text")).toBe(false);
  });

  it("detects mongo duplicate key errors", () => {
    expect(isMongoDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isMongoDuplicateKeyError({ code: 500 })).toBe(false);
    expect(isMongoDuplicateKeyError(new Error("boom"))).toBe(false);
    expect(isMongoDuplicateKeyError(null)).toBe(false);
  });
});
