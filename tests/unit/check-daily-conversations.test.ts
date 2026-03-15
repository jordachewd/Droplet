import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

describe("checkDailyConversationLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as never);
  });

  it("reads the durable daily conversation counter for finite plans", async () => {
    const now = new Date("2026-03-11T14:30:00.000Z");
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        dailyConversationsStarted: 3,
        dailyConversationWindowStart: new Date("2026-03-11T00:00:00.000Z"),
      }),
    } as never);

    const result = await checkDailyConversationLimit("user_123", "Lite", now);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith({ clerkId: "user_123" });
    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 3,
      remaining: 2,
    });
  });

  it("resets the used count when the stored counter is from a previous UTC day", async () => {
    const now = new Date("2026-03-11T23:30:00.000-05:00");
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        dailyConversationsStarted: 4,
        dailyConversationWindowStart: new Date("2026-03-11T00:00:00.000Z"),
      }),
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
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        dailyConversationsStarted: 50,
        dailyConversationWindowStart: new Date(),
      }),
    } as never);

    const result = await checkDailyConversationLimit("user_123", "Pro");

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
});
