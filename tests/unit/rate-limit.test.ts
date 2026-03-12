import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { connectToDatabase } from "@/lib/database/mongoose";
import RateLimitEntry from "@/lib/database/models/rate-limit-entry.model";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/rate-limit-entry.model", () => ({
  default: {
    collection: {
      findOneAndUpdate: vi.fn(),
    },
  },
}));

describe("enforceSlidingWindowRateLimit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists accepted requests and returns the remaining quota", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("request_1");
    vi.mocked(connectToDatabase).mockResolvedValue({} as never);
    vi.mocked(RateLimitEntry.collection.findOneAndUpdate).mockResolvedValue({
      requests: [
        {
          requestId: "request_1",
          timestamp: new Date(10_000),
        },
      ],
    } as never);

    const result = await enforceSlidingWindowRateLimit({
      key: "rate-limit-allow-test",
      limit: 2,
      windowMs: 1_000,
    });

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(RateLimitEntry.collection.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "rate-limit-allow-test" },
      expect.any(Array),
      expect.objectContaining({
        upsert: true,
        returnDocument: "after",
      }),
    );
    expect(result).toEqual({
      success: true,
      limit: 2,
      remaining: 1,
      resetAt: 11_000,
      retryAfterMs: 0,
    });
  });

  it("blocks requests when the sliding window is already full", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_500);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("request_3");
    vi.mocked(connectToDatabase).mockResolvedValue({} as never);
    vi.mocked(RateLimitEntry.collection.findOneAndUpdate).mockResolvedValue({
      requests: [
        {
          requestId: "request_1",
          timestamp: new Date(10_000),
        },
        {
          requestId: "request_2",
          timestamp: new Date(10_250),
        },
      ],
    } as never);

    const result = await enforceSlidingWindowRateLimit({
      key: "rate-limit-block-test",
      limit: 2,
      windowMs: 1_000,
    });

    expect(result).toEqual({
      success: false,
      limit: 2,
      remaining: 0,
      resetAt: 11_000,
      retryAfterMs: 500,
    });
  });
});
