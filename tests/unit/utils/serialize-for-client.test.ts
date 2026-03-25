import { describe, expect, it } from "vitest";
import serializeForClient from "@/lib/utils/serialize-for-client";

describe("serialize-for-client", () => {
  it("serializes Dates into ISO strings", () => {
    const createdAt = new Date("2026-03-25T10:00:00.000Z");

    const result = serializeForClient({
      id: "record_1",
      createdAt,
    });

    expect(result.createdAt).toBe("2026-03-25T10:00:00.000Z");
  });

  it("removes non-jsonable values from objects", () => {
    const result = serializeForClient({
      ok: true,
      count: 2,
      skippedUndefined: undefined,
      skippedFunction: () => "ignored",
      nested: {
        value: "kept",
        skipped: undefined,
      },
    });

    expect(result).toEqual({
      ok: true,
      count: 2,
      nested: {
        value: "kept",
      },
    });
  });

  it("returns a deep-cloned JSON-safe value", () => {
    const source = {
      nested: {
        label: "source",
      },
      list: [1, 2, 3],
    };

    const result = serializeForClient(source);
    result.nested.label = "changed";
    result.list.push(4);

    expect(source.nested.label).toBe("source");
    expect(source.list).toEqual([1, 2, 3]);
  });
});
