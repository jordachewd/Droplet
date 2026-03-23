import { describe, expect, it } from "vitest";
import { handleError } from "@/lib/utils/handleError";

type ErrorWithCause = Error & { cause?: unknown };

function captureThrownError(fn: () => void): ErrorWithCause {
  try {
    fn();
    throw new Error("Expected handleError to throw.");
  } catch (error) {
    return error as ErrorWithCause;
  }
}

describe("handleError", () => {
  it("preserves Error messages and appends source context", () => {
    const originalError = new Error("Task creation failed");

    const thrownError = captureThrownError(() =>
      handleError({ error: originalError, source: "createTask" }),
    );

    expect(thrownError.message).toBe("Task creation failed | createTask");
    expect(thrownError.cause).toBe(originalError);
  });

  it("supports string errors and appends source context", () => {
    const thrownError = captureThrownError(() =>
      handleError({ error: "Unauthorized", source: "checkoutPlan" }),
    );

    expect(thrownError.message).toBe("Unauthorized | checkoutPlan");
    expect(thrownError.cause).toBe("Unauthorized");
  });

  it("uses a generic fallback message for non-error values", () => {
    const payload = { reason: "invalid" };

    const thrownError = captureThrownError(() =>
      handleError({ error: payload }),
    );

    expect(thrownError.message).toBe("Unexpected error");
    expect(thrownError.cause).toBe(payload);
  });

  it("omits source suffix when source is not provided", () => {
    const originalError = new Error("Unauthorized");

    const thrownError = captureThrownError(() =>
      handleError({ error: originalError }),
    );

    expect(thrownError.message).toBe("Unauthorized");
    expect(thrownError.cause).toBe(originalError);
  });
});
