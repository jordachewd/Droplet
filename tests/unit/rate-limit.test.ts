import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";

describe("enforceSlidingWindowRateLimit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests up to the limit and then blocks additional requests", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);

    const first = enforceSlidingWindowRateLimit({
      key: "rate-limit-block-test",
      limit: 2,
      windowMs: 1_000,
    });
    const second = enforceSlidingWindowRateLimit({
      key: "rate-limit-block-test",
      limit: 2,
      windowMs: 1_000,
    });
    const third = enforceSlidingWindowRateLimit({
      key: "rate-limit-block-test",
      limit: 2,
      windowMs: 1_000,
    });

    expect(first.success).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.success).toBe(false);
    expect(third.retryAfterMs).toBe(1_000);
  });

  it("allows requests again after the time window has elapsed", () => {
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(20_000);
    enforceSlidingWindowRateLimit({
      key: "rate-limit-reset-test",
      limit: 1,
      windowMs: 1_000,
    });

    nowSpy.mockReturnValue(20_500);
    const blocked = enforceSlidingWindowRateLimit({
      key: "rate-limit-reset-test",
      limit: 1,
      windowMs: 1_000,
    });

    nowSpy.mockReturnValue(21_001);
    const allowedAgain = enforceSlidingWindowRateLimit({
      key: "rate-limit-reset-test",
      limit: 1,
      windowMs: 1_000,
    });

    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterMs).toBe(500);
    expect(allowedAgain.success).toBe(true);
    expect(allowedAgain.remaining).toBe(0);
  });
});
