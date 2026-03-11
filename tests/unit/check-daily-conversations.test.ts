import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import Task from "@/lib/database/models/tasks.model";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    countDocuments: vi.fn(),
  },
}));

describe("checkDailyConversationLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(Task.countDocuments).mockResolvedValue(0 as never);
  });

  it("counts today's conversations for finite plans", async () => {
    vi.mocked(Task.countDocuments).mockResolvedValue(3 as never);
    const now = new Date("2026-03-11T14:30:00.000Z");
    const expectedStartOfDay = new Date(now);
    expectedStartOfDay.setHours(0, 0, 0, 0);

    const result = await checkDailyConversationLimit("user_123", "Lite", now);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Task.countDocuments).toHaveBeenCalledWith({
      userId: "user_123",
      createdAt: {
        $gte: expectedStartOfDay,
      },
    });
    expect(result).toEqual({
      allowed: true,
      limit: 5,
      used: 3,
      remaining: 2,
    });
  });

  it("returns allowed false when the daily limit is reached", async () => {
    vi.mocked(Task.countDocuments).mockResolvedValue(50 as never);

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
    expect(Task.countDocuments).not.toHaveBeenCalled();
    expect(result).toEqual({
      allowed: true,
      limit: -1,
      used: 0,
      remaining: -1,
    });
  });
});
