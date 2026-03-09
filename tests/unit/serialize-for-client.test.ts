import { describe, expect, it } from "vitest";
import serializeForClient from "@/lib/utils/serialize-for-client";

describe("serializeForClient", () => {
  it("serializes values using JSON semantics", () => {
    const input = {
      id: "doc_1",
      createdAt: new Date("2026-03-05T12:00:00.000Z"),
      nested: { count: 3 },
    };

    const result = serializeForClient(input);

    expect(result).toEqual({
      id: "doc_1",
      createdAt: "2026-03-05T12:00:00.000Z",
      nested: { count: 3 },
    });
  });

  it("drops undefined properties exactly like JSON.stringify", () => {
    const result = serializeForClient({
      defined: "value",
      optional: undefined as string | undefined,
    });

    expect(result).toEqual({ defined: "value" });
  });
});
