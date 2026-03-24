import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import {
  checkDailyConversationLimit,
  claimDailyConversationSlot,
} from "@/lib/utils/check-daily-conversations";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

describe("checkDailyConversationLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(User.findOne).mockResolvedValue(null as never);
  });

  it("reads the durable daily conversation counter for finite plans", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    vi.mocked(User.findOne).mockResolvedValue({
      dailyConversationsStarted: 3,
      dailyConversationWindowStart: new Date("2026-03-11T00:00:00.000Z"),
    } as never);

    const result = await checkDailyConversationLimit("user_123", "Lite", now);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith(
      { clerkId: "user_123" },
      "dailyConversationsStarted dailyConversationWindowStart",
      { lean: true },
    );
    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 3,
      remaining: 2,
    });
  });

  it("resets the used count when the stored counter is from a previous UTC day", async () => {
    const now = new Date("2026-03-11T23:30:00.000-05:00");
    vi.mocked(User.findOne).mockResolvedValue({
      dailyConversationsStarted: 4,
      dailyConversationWindowStart: new Date("2026-03-11T00:00:00.000Z"),
    } as never);

    const result = await checkDailyConversationLimit("user_123", "Lite", now);

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 0,
      remaining: 5,
    });
  });

  it("returns allowed false when the daily limit is reached", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    vi.mocked(User.findOne).mockResolvedValue({
      dailyConversationsStarted: 50,
      dailyConversationWindowStart: now,
    } as never);

    const result = await checkDailyConversationLimit("user_123", "Pro", now);

    expect(result).toEqual({
      allowed: false,
      limit: 50,
      used: 50,
      remaining: 0,
    });
  });

  it("bypasses counting for unlimited plans", async () => {
    const result = await checkDailyConversationLimit("user_123", "Premium");

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({
      allowed: true,
      limit: -1,
      used: 0,
      remaining: -1,
    });
  });

  it("defaults to Lite conversation limits when planName is omitted", async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      dailyConversationsStarted: 2,
      dailyConversationWindowStart: new Date("2026-03-11T00:00:00.000Z"),
    } as never);

    const result = await checkDailyConversationLimit(
      "user_123",
      undefined,
      new Date("2026-03-11T13:00:00.000Z"),
    );

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 2,
      remaining: 3,
    });
  });

  it("treats invalid window timestamps and negative counters as zero usage", async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      dailyConversationsStarted: -10,
      dailyConversationWindowStart: "invalid-date",
    } as never);

    const result = await checkDailyConversationLimit(
      "user_123",
      "Lite",
      new Date("2026-03-11T13:00:00.000Z"),
    );

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 0,
      remaining: 5,
    });
  });
});

function mockFindOneAndUpdateChain(resolvedValue: unknown) {
  return {
    lean: vi.fn().mockResolvedValue(resolvedValue),
  };
}

describe("claimDailyConversationSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(User.findOneAndUpdate).mockReturnValue(
      mockFindOneAndUpdateChain(null) as never,
    );
  });

  it("claims a slot atomically within the current window", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    vi.mocked(User.findOneAndUpdate).mockReturnValueOnce(
      mockFindOneAndUpdateChain({
        dailyConversationsStarted: 4,
      }) as never,
    );

    const result = await claimDailyConversationSlot("user_123", "Lite", now);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_123",
        dailyConversationsStarted: { $lt: 5 },
      }),
      expect.objectContaining({
        $inc: { dailyConversationsStarted: 1 },
      }),
      expect.objectContaining({
        strict: true,
        upsert: false,
        returnDocument: "after",
      }),
    );
    expect(result).toEqual({
      claimed: true,
      limit: 5,
      used: 4,
      remaining: 1,
    });
  });

  it("returns used=1 when the atomic increment returns no explicit counter", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValueOnce(
      mockFindOneAndUpdateChain({}) as never,
    );

    const result = await claimDailyConversationSlot("user_123", "Lite");

    expect(result).toEqual({
      claimed: true,
      limit: 5,
      used: 1,
      remaining: 4,
    });
  });

  it("resets window and claims slot at midnight boundary", async () => {
    const now = new Date("2026-03-12T00:01:00.000Z");
    // First attempt (current window) returns null — stale window
    vi.mocked(User.findOneAndUpdate)
      .mockReturnValueOnce(mockFindOneAndUpdateChain(null) as never)
      .mockReturnValueOnce(
        mockFindOneAndUpdateChain({
          dailyConversationsStarted: 1,
        }) as never,
      );

    const result = await claimDailyConversationSlot("user_123", "Lite", now);

    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      claimed: true,
      limit: 5,
      used: 1,
      remaining: 4,
    });
  });

  it("returns claimed false when limit is reached in current window", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    // Both attempts return null — at limit and window is current
    vi.mocked(User.findOneAndUpdate)
      .mockReturnValueOnce(mockFindOneAndUpdateChain(null) as never)
      .mockReturnValueOnce(mockFindOneAndUpdateChain(null) as never);

    const result = await claimDailyConversationSlot("user_123", "Lite", now);

    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      claimed: false,
      limit: 5,
      used: 5,
      remaining: 0,
    });
  });

  it("uses UTC midnight as the current-window boundary", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    vi.mocked(User.findOneAndUpdate).mockReturnValueOnce(
      mockFindOneAndUpdateChain({
        dailyConversationsStarted: 2,
      }) as never,
    );

    await claimDailyConversationSlot("user_123", "Lite", now);

    expect(User.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        clerkId: "user_123",
        dailyConversationWindowStart: {
          $gte: new Date("2026-03-11T00:00:00.000Z"),
        },
      }),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("claims at exact boundary (4/5 used, slot 5 is the last)", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValueOnce(
      mockFindOneAndUpdateChain({
        dailyConversationsStarted: 5,
      }) as never,
    );

    const result = await claimDailyConversationSlot("user_123", "Lite");

    expect(result).toEqual({
      claimed: true,
      limit: 5,
      used: 5,
      remaining: 0,
    });
  });

  it("bypasses claiming for unlimited plans", async () => {
    const result = await claimDailyConversationSlot("user_123", "Premium");

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: true,
      limit: -1,
      used: 0,
      remaining: -1,
    });
  });
});
