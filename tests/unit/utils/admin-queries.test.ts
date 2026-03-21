import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import Transaction from "@/lib/database/models/transaction.model";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import { getAdminTransactions, getAdminUsers } from "@/lib/utils/admin-queries";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/usage-event.model", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/public-page.model", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/utils/effective-plan-config", () => ({
  getEffectivePlanConfig: vi.fn(),
}));

vi.mock("@/lib/utils/effective-persona-config", () => ({
  getEffectivePersonaConfig: vi.fn(),
}));

describe("admin-queries pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(getEffectivePlanConfig).mockResolvedValue({
      limits: {
        Lite: {
          conversationsPerDay: 5,
          promptsPerConversation: 10,
          images: 3,
          audio: 3,
          video: 1,
        },
        Pro: {
          conversationsPerDay: 50,
          promptsPerConversation: 100,
          images: 50,
          audio: 50,
          video: 10,
        },
        Premium: {
          conversationsPerDay: -1,
          promptsPerConversation: -1,
          images: -1,
          audio: -1,
          video: -1,
        },
      },
    } as never);
  });

  it("paginates getAdminUsers with skip and limit", async () => {
    vi.mocked(User.countDocuments).mockResolvedValue(53 as never);

    const usersLean = vi.fn().mockResolvedValue([
      {
        _id: "mongo_user_1",
        clerkId: "clerk_1",
        username: "alice",
        email: "alice@example.com",
        role: "client",
        suspended: false,
        registerAt: "2026-03-01T10:00:00.000Z",
        dailyConversationsStarted: 2,
        plan: {
          name: "Lite",
          imageGenerations: 1,
          audioGenerations: 0,
          videoGenerations: 0,
        },
      },
    ]);
    const usersSelect = vi.fn().mockReturnValue({ lean: usersLean });
    const usersLimit = vi.fn().mockReturnValue({ select: usersSelect });
    const usersSkip = vi.fn().mockReturnValue({ limit: usersLimit });
    const usersSort = vi.fn().mockReturnValue({ skip: usersSkip });

    vi.mocked(User.find).mockReturnValue({ sort: usersSort } as never);

    const response = await getAdminUsers("ali", 2, 25);

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.countDocuments).toHaveBeenCalledWith({
      $or: [
        { username: { $regex: "ali", $options: "i" } },
        { email: { $regex: "ali", $options: "i" } },
      ],
    });
    expect(usersSkip).toHaveBeenCalledWith(25);
    expect(usersLimit).toHaveBeenCalledWith(25);
    expect(response.total).toBe(53);
    expect(response.page).toBe(2);
    expect(response.pageSize).toBe(25);
    expect(response.totalPages).toBe(3);
    expect(response.items).toEqual([
      expect.objectContaining({
        id: "mongo_user_1",
        username: "alice",
        conversationUsage: { used: 2, limit: 5 },
      }),
    ]);
  });

  it("clamps getAdminUsers page and pageSize bounds", async () => {
    vi.mocked(User.countDocuments).mockResolvedValue(3 as never);

    const usersLean = vi.fn().mockResolvedValue([]);
    const usersSelect = vi.fn().mockReturnValue({ lean: usersLean });
    const usersLimit = vi.fn().mockReturnValue({ select: usersSelect });
    const usersSkip = vi.fn().mockReturnValue({ limit: usersLimit });
    const usersSort = vi.fn().mockReturnValue({ skip: usersSkip });

    vi.mocked(User.find).mockReturnValue({ sort: usersSort } as never);

    const response = await getAdminUsers(undefined, 99, 500);

    expect(usersSkip).toHaveBeenCalledWith(0);
    expect(usersLimit).toHaveBeenCalledWith(100);
    expect(response.page).toBe(1);
    expect(response.pageSize).toBe(100);
    expect(response.totalPages).toBe(1);
  });

  it("paginates getAdminTransactions and maps users", async () => {
    vi.mocked(Transaction.countDocuments).mockResolvedValue(26 as never);

    const transactionsLean = vi.fn().mockResolvedValue([
      {
        _id: "txn_1",
        userId: "mongo_user_1",
        clerkId: "clerk_1",
        stripeId: "cs_123",
        createdAt: "2026-03-01T10:00:00.000Z",
        expiresOn: "2099-03-01T10:00:00.000Z",
        amount: 19,
        plan: "Pro",
        billing: "Monthly",
      },
    ]);
    const transactionsSelect = vi
      .fn()
      .mockReturnValue({ lean: transactionsLean });
    const transactionsLimit = vi.fn().mockReturnValue({
      select: transactionsSelect,
    });
    const transactionsSkip = vi.fn().mockReturnValue({
      limit: transactionsLimit,
    });
    const transactionsSort = vi.fn().mockReturnValue({
      skip: transactionsSkip,
    });

    vi.mocked(Transaction.find).mockReturnValue({
      sort: transactionsSort,
    } as never);

    const usersLean = vi
      .fn()
      .mockResolvedValue([
        { _id: "mongo_user_1", username: "alice", email: "alice@example.com" },
      ]);
    const usersSelect = vi.fn().mockReturnValue({ lean: usersLean });
    vi.mocked(User.find).mockReturnValue({ select: usersSelect } as never);

    const response = await getAdminTransactions(2, 10);

    expect(transactionsSkip).toHaveBeenCalledWith(10);
    expect(transactionsLimit).toHaveBeenCalledWith(10);
    expect(response.total).toBe(26);
    expect(response.page).toBe(2);
    expect(response.totalPages).toBe(3);
    expect(response.items).toEqual([
      expect.objectContaining({
        id: "txn_1",
        username: "alice",
        status: "Active",
      }),
    ]);
  });

  it("skips user lookup when no transactions exist on the current page", async () => {
    vi.mocked(Transaction.countDocuments).mockResolvedValue(0 as never);

    const transactionsLean = vi.fn().mockResolvedValue([]);
    const transactionsSelect = vi
      .fn()
      .mockReturnValue({ lean: transactionsLean });
    const transactionsLimit = vi.fn().mockReturnValue({
      select: transactionsSelect,
    });
    const transactionsSkip = vi.fn().mockReturnValue({
      limit: transactionsLimit,
    });
    const transactionsSort = vi.fn().mockReturnValue({
      skip: transactionsSkip,
    });

    vi.mocked(Transaction.find).mockReturnValue({
      sort: transactionsSort,
    } as never);

    const response = await getAdminTransactions();

    expect(User.find).not.toHaveBeenCalled();
    expect(response.page).toBe(1);
    expect(response.totalPages).toBe(1);
    expect(response.items).toEqual([]);
  });
});
