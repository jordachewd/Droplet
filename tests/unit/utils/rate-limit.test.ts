import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { createTestUser } from "../test-support";

const { connectToDatabaseMock, findOneAndUpdateMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findOneAndUpdateMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/rate-limit-entry.model", () => ({
  default: {
    collection: {
      findOneAndUpdate: findOneAndUpdateMock,
    },
  },
}));

function createRateLimitKey() {
  const user = createTestUser({
    clerkId: "user_rate_limit_123",
  });

  return `openai:${user.clerkId}`;
}

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("accepts a request when the generated requestId is persisted", async () => {
    const key = createRateLimitKey();

    vi.spyOn(crypto, "randomUUID").mockReturnValue("req_current");
    findOneAndUpdateMock.mockResolvedValue({
      requests: [
        {
          requestId: "req_current",
          timestamp: new Date("2026-03-24T12:00:00.000Z"),
        },
        {
          requestId: "req_previous",
          timestamp: new Date("2026-03-24T11:59:40.000Z"),
        },
      ],
    });

    const result = await enforceSlidingWindowRateLimit({
      key,
      limit: 3,
      windowMs: 60_000,
    });

    expect(connectToDatabaseMock).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { key },
      expect.any(Array),
      expect.objectContaining({
        upsert: true,
        returnDocument: "after",
      }),
    );
    expect(result).toEqual({
      success: true,
      limit: 3,
      remaining: 1,
      resetAt: new Date("2026-03-24T12:00:40.000Z").getTime(),
      retryAfterMs: 0,
    });
  });

  it("blocks a request when persisted requests do not contain the new requestId", async () => {
    const key = createRateLimitKey();

    vi.spyOn(crypto, "randomUUID").mockReturnValue("req_new");
    findOneAndUpdateMock.mockResolvedValue({
      requests: [
        {
          requestId: "req_a",
          timestamp: "2026-03-24T11:59:30.000Z",
        },
        {
          requestId: "req_b",
          timestamp: "2026-03-24T11:59:50.000Z",
        },
      ],
    });

    const result = await enforceSlidingWindowRateLimit({
      key,
      limit: 2,
      windowMs: 60_000,
    });

    expect(result).toEqual({
      success: false,
      limit: 2,
      remaining: 0,
      resetAt: new Date("2026-03-24T12:00:30.000Z").getTime(),
      retryAfterMs: 30_000,
    });
  });

  it("normalizes stored request timestamps and filters invalid entries", async () => {
    const key = createRateLimitKey();

    vi.spyOn(crypto, "randomUUID").mockReturnValue("req_valid");
    findOneAndUpdateMock.mockResolvedValue({
      requests: [
        { requestId: "", timestamp: new Date("2026-03-24T11:59:50.000Z") },
        { requestId: "req_bad_time", timestamp: "not-a-date" },
        {
          requestId: "req_old",
          timestamp: new Date("2026-03-24T11:59:10.000Z"),
        },
        {
          requestId: "req_valid",
          timestamp: new Date("2026-03-24T12:00:00.000Z"),
        },
      ],
    });

    const result = await enforceSlidingWindowRateLimit({
      key,
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.resetAt).toBe(new Date("2026-03-24T12:00:10.000Z").getTime());
  });

  it("returns blocked response when storage returns no persisted requests", async () => {
    const key = createRateLimitKey();

    vi.spyOn(crypto, "randomUUID").mockReturnValue("req_missing");
    findOneAndUpdateMock.mockResolvedValue(null);

    const result = await enforceSlidingWindowRateLimit({
      key,
      limit: 1,
      windowMs: 60_000,
    });

    expect(result).toEqual({
      success: false,
      limit: 1,
      remaining: 0,
      resetAt: new Date("2026-03-24T12:01:00.000Z").getTime(),
      retryAfterMs: 60_000,
    });
  });
});
