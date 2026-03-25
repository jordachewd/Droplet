import { afterEach, describe, expect, it, vi } from "vitest";
import { generateString } from "@/lib/utils/generateString";

describe("generateString", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates a default 16-character string", () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values.fill(0);
      return values;
    });

    vi.stubGlobal("crypto", { getRandomValues });

    const result = generateString();

    expect(result).toHaveLength(16);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(getRandomValues.mock.calls[0]?.[0]).toBeInstanceOf(Uint32Array);
    expect((getRandomValues.mock.calls[0]?.[0] as Uint32Array).length).toBe(16);
  });

  it("uses provided length and maps random values into the allowed charset", () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values.set([0, 1, 2, 61]);
      return values;
    });

    vi.stubGlobal("crypto", { getRandomValues });

    const result = generateString(4);

    expect(result).toBe("ABC9");
  });

  it("falls back to default length when length is 0", () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values.fill(5);
      return values;
    });

    vi.stubGlobal("crypto", { getRandomValues });

    const result = generateString(0);

    expect(result).toHaveLength(16);
  });
});
