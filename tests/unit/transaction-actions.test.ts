import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import { getAllTransactions } from "@/lib/actions/transaction.action";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

describe("getAllTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("returns transactions for the authenticated owner", async () => {
    const execMock = vi
      .fn()
      .mockResolvedValue([{ stripeId: "txn_1", clerkId: "clerk_user_1" }]);
    const leanMock = vi.fn().mockReturnValue({
      exec: execMock,
    });

    vi.mocked(Transaction.find).mockReturnValue({
      lean: leanMock,
    } as never);

    const response = await getAllTransactions("clerk_user_1");

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Transaction.find).toHaveBeenCalledWith(
      { clerkId: "clerk_user_1" },
      null,
      {
        sort: { createdAt: -1 },
      },
    );
    expect(leanMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(response).toEqual([{ stripeId: "txn_1", clerkId: "clerk_user_1" }]);
  });

  it("throws forbidden when user requests another user's transactions", async () => {
    await expect(getAllTransactions("clerk_user_2")).rejects.toThrow(
      "Forbidden | getAllTransactions",
    );

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  it("throws unauthorized when no authenticated user exists", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(getAllTransactions("clerk_user_1")).rejects.toThrow(
      "Unauthorized | getAllTransactions",
    );

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Transaction.find).not.toHaveBeenCalled();
  });
});
