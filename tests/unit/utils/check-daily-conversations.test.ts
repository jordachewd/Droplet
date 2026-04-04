import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAN_LIMITS } from "@/constants/plans";
import {
  checkDailyConversationLimit,
  claimDailyConversationSlot,
} from "@/lib/utils/check-daily-conversations";
import { createTestUser } from "../test-support";

const { connectToDatabaseMock, findOneMock, findOneAndUpdateMock } = vi.hoisted(
  () => ({
    connectToDatabaseMock: vi.fn(),
    findOneMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(),
  }),
);

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

type LeanQuery<TValue> = {
  lean: () => Promise<TValue>;
};

function createLeanQuery<TValue>(value: TValue): LeanQuery<TValue> {
  return {
    lean: vi.fn().mockResolvedValue(value),
  };
}

describe("check-daily-conversations", () => {
  const liteUser = createTestUser({ plan: { name: "Lite" } });
  const premiumUser = createTestUser({ plan: { name: "Premium" } });
  const now = new Date("2026-03-24T12:00:00.000Z");

  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneMock.mockReset();
    findOneAndUpdateMock.mockReset();
  });

  it("returns unlimited allowance for unlimited plans without db calls", async () => {
    const result = await checkDailyConversationLimit(
      premiumUser.clerkId,
      premiumUser.plan.name,
    );

    expect(result).toEqual({
      allowed: true,
      limit: -1,
      used: 0,
      remaining: -1,
    });
    expect(connectToDatabaseMock).not.toHaveBeenCalled();
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("checks usage in current daily window for limited plans", async () => {
    findOneMock.mockResolvedValue({
      dailyConversationsStarted: 2,
      dailyConversationWindowStart: new Date("2026-03-24T00:00:00.000Z"),
    });

    const result = await checkDailyConversationLimit(
      liteUser.clerkId,
      liteUser.plan.name,
      now,
    );

    expect(result).toEqual({
      allowed: true,
      limit: PLAN_LIMITS.Lite.conversationsPerDay,
      used: 2,
      remaining: 8,
    });
    expect(connectToDatabaseMock).toHaveBeenCalledTimes(1);
    expect(findOneMock).toHaveBeenCalledTimes(1);
  });

  it("treats stale daily windows as zero usage", async () => {
    findOneMock.mockResolvedValue({
      dailyConversationsStarted: 10,
      dailyConversationWindowStart: new Date("2026-03-23T23:59:59.000Z"),
    });

    const result = await checkDailyConversationLimit(
      liteUser.clerkId,
      liteUser.plan.name,
      now,
    );

    expect(result).toEqual({
      allowed: true,
      limit: PLAN_LIMITS.Lite.conversationsPerDay,
      used: 0,
      remaining: 10,
    });
  });

  it("claims slot in current window on first atomic update", async () => {
    findOneAndUpdateMock.mockReturnValue(
      createLeanQuery({ dailyConversationsStarted: 3 }),
    );

    const result = await claimDailyConversationSlot(
      liteUser.clerkId,
      liteUser.plan.name,
      now,
    );

    expect(result).toEqual({
      claimed: true,
      limit: PLAN_LIMITS.Lite.conversationsPerDay,
      used: 3,
      remaining: 7,
    });
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("claims slot with reset when current window claim fails", async () => {
    findOneAndUpdateMock
      .mockReturnValueOnce(createLeanQuery(null))
      .mockReturnValueOnce(createLeanQuery({ dailyConversationsStarted: 1 }));

    const result = await claimDailyConversationSlot(
      liteUser.clerkId,
      liteUser.plan.name,
      now,
    );

    expect(result).toEqual({
      claimed: true,
      limit: PLAN_LIMITS.Lite.conversationsPerDay,
      used: 1,
      remaining: 9,
    });
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("returns not-claimed when both atomic attempts fail", async () => {
    findOneAndUpdateMock
      .mockReturnValueOnce(createLeanQuery(null))
      .mockReturnValueOnce(createLeanQuery(null));

    const result = await claimDailyConversationSlot(
      liteUser.clerkId,
      liteUser.plan.name,
      now,
    );

    expect(result).toEqual({
      claimed: false,
      limit: PLAN_LIMITS.Lite.conversationsPerDay,
      used: PLAN_LIMITS.Lite.conversationsPerDay,
      remaining: 0,
    });
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("returns unlimited claim for unlimited plans without db calls", async () => {
    const result = await claimDailyConversationSlot(
      premiumUser.clerkId,
      premiumUser.plan.name,
    );

    expect(result).toEqual({
      claimed: true,
      limit: -1,
      used: 0,
      remaining: -1,
    });
    expect(connectToDatabaseMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });
});
