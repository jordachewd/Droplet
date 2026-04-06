/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
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
  it("preserves whitelisted auth errors", () => {
    const rootCause = new Error("Unauthorized");

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause, source: "action" });
    });

    expect(thrownError.message).toBe("Unauthorized");
    expect(thrownError.cause).toBe(rootCause);
  });

  it("preserves whitelisted validation errors", () => {
    const rootCause = new Error("Invalid task payload.");

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause, source: "createTask" });
    });

    expect(thrownError.message).toBe("Invalid task payload.");
    expect(thrownError.cause).toBe(rootCause);
  });

  it("sanitizes non-whitelisted Error messages", () => {
    const rootCause = new Error("Mongo timeout while acquiring connection");

    const thrownError = captureThrownError(() => {
      handleError({ error: rootCause, source: "db-query" });
    });

    expect(thrownError.message).toBe("An unexpected error occurred");
    expect(thrownError.cause).toBe(rootCause);
  });

  it("sanitizes non-whitelisted string errors", () => {
    const thrownError = captureThrownError(() => {
      handleError({ error: "provider exploded", source: "openai-route" });
    });

    expect(thrownError.message).toBe("An unexpected error occurred");
    expect(thrownError.cause).toBe("provider exploded");
  });

  it("logs full detail to stderr for debugging", () => {
    const stderrWriteSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const rootCause = new Error("Database unavailable");

    captureThrownError(() => {
      handleError({ error: rootCause, source: "getUserById" });
    });

    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[handleError] getUserById | Database unavailable",
      ),
    );
    stderrWriteSpy.mockRestore();
  });
});
