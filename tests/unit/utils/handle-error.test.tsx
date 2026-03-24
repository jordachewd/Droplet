import { describe, expect, it } from "vitest";
import { handleError } from "@/lib/utils/handleError";

function captureThrownError(callback: () => void): Error {
  try {
    callback();
  } catch (error) {
    return error as Error;
  }

  throw new Error("Expected function to throw.");
}

describe("handleError", () => {
  it("throws with error message and preserves original cause for Error input", () => {
    const rootCause = new Error("Database unavailable");

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause });
    });

    expect(thrownError.message).toBe("Database unavailable");
    expect(thrownError.cause).toBe(rootCause);
  });

  it("appends source when provided for Error input", () => {
    const rootCause = new Error("Operation failed");

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause, source: "generateTitle" });
    });

    expect(thrownError.message).toBe("Operation failed | generateTitle");
    expect(thrownError.cause).toBe(rootCause);
  });

  it("handles string errors and includes source suffix", () => {
    const thrownError = captureThrownError(() => {
      handleError({ error: "invalid payload", source: "openai-route" });
    });

    expect(thrownError.message).toBe("invalid payload | openai-route");
    expect(thrownError.cause).toBe("invalid payload");
  });

  it("uses fallback message for unknown error values", () => {
    const rootCause = { code: "E_UNKNOWN" };

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause });
    });

    expect(thrownError.message).toBe("Unexpected error");
    expect(thrownError.cause).toBe(rootCause);
  });
});
