import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestTransaction,
  createTestUser,
  mockMongooseModel,
} from "../test-support";

const {
  connectToDatabaseMock,
  getEffectivePlanConfigMock,
  getEffectivePersonaConfigMock,
  isValidObjectIdMock,
  userModelMock,
  taskModelMock,
  transactionModelMock,
  usageEventModelMock,
  appSettingModelMock,
  publicPageModelMock,
} = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  getEffectivePlanConfigMock: vi.fn(),
  getEffectivePersonaConfigMock: vi.fn(),
  isValidObjectIdMock: vi.fn(),
  userModelMock: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
  taskModelMock: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  transactionModelMock: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
  usageEventModelMock: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  appSettingModelMock: {
    find: vi.fn(),
  },
  publicPageModelMock: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: userModelMock,
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: taskModelMock,
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: transactionModelMock,
}));

vi.mock("@/lib/database/models/usage-event.model", () => ({
  default: usageEventModelMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: appSettingModelMock,
}));

vi.mock("@/lib/database/models/public-page.model", () => ({
  default: publicPageModelMock,
}));

vi.mock("@/lib/utils/effective-plan-config", () => ({
  getEffectivePlanConfig: getEffectivePlanConfigMock,
}));

vi.mock("@/lib/utils/effective-persona-config", () => ({
  getEffectivePersonaConfig: getEffectivePersonaConfigMock,
}));

vi.mock("mongoose", () => ({
  isValidObjectId: isValidObjectIdMock,
}));

import {
  getAdminDashboardStats,
  getAdminPublicPage,
  getAdminSettingsSnapshot,
  getAdminTransactionDetail,
  getAdminTransactions,
  getAdminUsageAnalytics,
  getAdminUserDetail,
  getAdminUsers,
  getAdminWebsitePages,
} from "@/lib/utils/admin-queries";

function createEffectivePlanConfig() {
  return {
    limits: {
      Lite: {
        conversationsPerDay: 5,
        promptsPerConversation: 10,
        images: 3,
        audio: 3,
      },
      Pro: {
        conversationsPerDay: 20,
        promptsPerConversation: 40,
        images: 50,
        audio: 50,
      },
      Premium: {
        conversationsPerDay: -1,
        promptsPerConversation: -1,
        images: -1,
        audio: -1,
      },
    },
    trialLimits: {
      images: 3,
      audio: 2,
    },
  };
}

describe("admin-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectToDatabaseMock.mockResolvedValue(undefined);
    getEffectivePlanConfigMock.mockResolvedValue(createEffectivePlanConfig());
    getEffectivePersonaConfigMock.mockResolvedValue([
      { id: "strategist", label: "Strategist (Configured)" },
    ]);
    isValidObjectIdMock.mockReturnValue(true);
  });

  it("returns dashboard stats cards with usage breakdown counts", async () => {
    userModelMock.countDocuments.mockResolvedValue(11);
    taskModelMock.countDocuments.mockResolvedValue(17);
    transactionModelMock.countDocuments.mockResolvedValue(23);
    usageEventModelMock.countDocuments
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(5);

    const result = await getAdminDashboardStats();

    expect(connectToDatabaseMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      expect.objectContaining({ label: "Users", value: 11 }),
      expect.objectContaining({ label: "Conversations", value: 17 }),
      expect.objectContaining({ label: "Transactions", value: 23 }),
      expect.objectContaining({ label: "Usage Events", value: 31 }),
      expect.objectContaining({ label: "Images Generated", value: 7 }),
      expect.objectContaining({ label: "Audio Generated", value: 5 }),
    ]);
  });

  it("returns paginated admin users with limits and usage metadata", async () => {
    const user = createTestUser({
      _id: "507f1f77bcf86cd799439011",
      plan: {
        name: "Lite",
        imageGenerations: 2,
        audioGenerations: 1,
      },
      dailyConversationsStarted: 4,
    });
    userModelMock.countDocuments.mockResolvedValue(1);
    userModelMock.find.mockReturnValue(mockMongooseModel([user]));

    const result = await getAdminUsers("  test.user@example.com  ", 99, 999);

    expect(userModelMock.countDocuments).toHaveBeenCalledWith({
      $or: [
        { username: { $regex: "test.user@example.com", $options: "i" } },
        { email: { $regex: "test.user@example.com", $options: "i" } },
      ],
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(100);
    expect(result.totalPages).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: String(user._id),
        clerkId: user.clerkId,
        planName: "Lite",
        mediaUsage: {
          images: { used: 2, limit: 3 },
          audio: { used: 1, limit: 3 },
        },
        conversationUsage: {
          used: 4,
          limit: 5,
        },
      }),
    );
  });

  it("falls back for invalid pagination inputs and null date fields", async () => {
    const user = createTestUser({
      _id: "507f1f77bcf86cd799439044",
      registerAt: undefined,
    });
    userModelMock.countDocuments.mockResolvedValue(1);
    userModelMock.find.mockReturnValue(mockMongooseModel([user]));

    const nanResult = await getAdminUsers(undefined, Number.NaN, Number.NaN);
    const zeroResult = await getAdminUsers(undefined, 0, 0);

    expect(nanResult.page).toBe(1);
    expect(nanResult.pageSize).toBe(25);
    expect(nanResult.items[0]?.registerAt).toBeNull();
    expect(zeroResult.page).toBe(1);
    expect(zeroResult.pageSize).toBe(25);
  });

  it('returns "ADMIN" plan label and unlimited limits for admin users list rows', async () => {
    const adminUser = createTestUser({
      _id: "507f1f77bcf86cd799439099",
      role: "admin",
      plan: {
        name: "Lite",
        imageGenerations: 4,
        audioGenerations: 2,
      },
      dailyConversationsStarted: 8,
    });

    userModelMock.countDocuments.mockResolvedValue(1);
    userModelMock.find.mockReturnValue(mockMongooseModel([adminUser]));

    const result = await getAdminUsers(undefined, 1, 25);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        planName: "ADMIN",
        mediaUsage: {
          images: { used: 4, limit: -1 },
          audio: { used: 2, limit: -1 },
        },
        conversationUsage: {
          used: 8,
          limit: -1,
        },
      }),
    );
  });

  it("returns null from getAdminUserDetail when object id is invalid", async () => {
    isValidObjectIdMock.mockReturnValue(false);

    const result = await getAdminUserDetail("invalid-id");

    expect(result).toBeNull();
    expect(connectToDatabaseMock).not.toHaveBeenCalled();
  });

  it("returns null from getAdminUserDetail when user is not found", async () => {
    userModelMock.findById.mockReturnValue(mockMongooseModel(null));

    const result = await getAdminUserDetail("507f1f77bcf86cd799439011");

    expect(result).toBeNull();
  });

  it("returns mapped user detail with transactions and usage aggregates", async () => {
    const user = createTestUser({
      _id: "507f1f77bcf86cd799439011",
      clerkId: "user_123",
      plan: {
        name: "Lite",
        amount: 0,
        billing: "Monthly",
        imageGenerations: 2,
        audioGenerations: 1,
        trialUsage: {
          trialImageGenerations: 1,
          trialAudioGenerations: 1,
        },
      },
      dailyConversationsStarted: 3,
    });
    const transaction = createTestTransaction({
      _id: "507f1f77bcf86cd799439013",
      clerkId: "user_123",
      amount: 1900,
      plan: "Pro",
    });

    userModelMock.findById.mockReturnValue(mockMongooseModel(user));
    taskModelMock.countDocuments.mockResolvedValue(9);
    taskModelMock.aggregate.mockResolvedValue([
      { totalPromptCount: 15, maxPromptCount: 7 },
    ]);
    transactionModelMock.find.mockReturnValue(mockMongooseModel([transaction]));

    const result = await getAdminUserDetail("507f1f77bcf86cd799439011");

    expect(result).toEqual(
      expect.objectContaining({
        id: String(user._id),
        clerkId: user.clerkId,
        conversationCount: 9,
        promptUsage: expect.objectContaining({
          used: 7,
          total: 15,
          limit: 10,
          remaining: 3,
        }),
        trialUsage: {
          images: { used: 1, limit: 3, remaining: 2 },
          audio: { used: 1, limit: 2, remaining: 1 },
        },
      }),
    );
    expect(result?.transactions).toEqual([
      expect.objectContaining({
        id: String(transaction._id),
        plan: "Pro",
        amount: 1900,
      }),
    ]);
  });

  it('returns "ADMIN" and unlimited usage limits in admin user detail', async () => {
    const adminUser = createTestUser({
      _id: "507f1f77bcf86cd799439155",
      clerkId: "admin_123",
      role: "admin",
      plan: {
        name: "Lite",
        amount: 0,
        billing: "Monthly",
        imageGenerations: 3,
        audioGenerations: 1,
        trialUsage: {
          trialImageGenerations: 2,
          trialAudioGenerations: 1,
        },
      },
      dailyConversationsStarted: 11,
    });

    userModelMock.findById.mockReturnValue(mockMongooseModel(adminUser));
    taskModelMock.countDocuments.mockResolvedValue(5);
    taskModelMock.aggregate.mockResolvedValue([
      { totalPromptCount: 17, maxPromptCount: 9 },
    ]);
    transactionModelMock.find.mockReturnValue(mockMongooseModel([]));

    const result = await getAdminUserDetail("507f1f77bcf86cd799439155");

    expect(result).toEqual(
      expect.objectContaining({
        planName: "ADMIN",
        promptUsage: expect.objectContaining({ limit: -1, remaining: -1 }),
        conversationUsage: expect.objectContaining({
          limit: -1,
          remaining: -1,
        }),
        mediaUsage: {
          images: expect.objectContaining({ limit: -1, remaining: -1 }),
          audio: expect.objectContaining({ limit: -1, remaining: -1 }),
        },
        trialUsage: {
          images: expect.objectContaining({ limit: -1, remaining: -1 }),
          audio: expect.objectContaining({ limit: -1, remaining: -1 }),
        },
      }),
    );
  });

  it("returns transactions page with mapped user data and active/expired status", async () => {
    const now = Date.now();
    const activeTx = createTestTransaction({
      _id: "tx_active",
      userId: "507f1f77bcf86cd799439011",
      expiresOn: new Date(now + 86_400_000),
    });
    const expiredTx = createTestTransaction({
      _id: "tx_expired",
      userId: "missing_user",
      expiresOn: new Date(now - 86_400_000),
    });

    transactionModelMock.countDocuments.mockResolvedValue(2);
    transactionModelMock.find.mockReturnValue(
      mockMongooseModel([activeTx, expiredTx]),
    );
    userModelMock.find.mockReturnValue(
      mockMongooseModel([
        {
          _id: "507f1f77bcf86cd799439011",
          username: "test-user",
          email: "test.user@example.com",
        },
      ]),
    );

    const result = await getAdminTransactions(1, 25);

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "tx_active",
        status: "Active",
        username: "test-user",
        email: "test.user@example.com",
      }),
      expect.objectContaining({
        id: "tx_expired",
        status: "Expired",
        username: "Unknown user",
        email: "Unknown email",
      }),
    ]);
  });

  it("returns null from getAdminTransactionDetail when object id is invalid", async () => {
    isValidObjectIdMock.mockReturnValue(false);

    const result = await getAdminTransactionDetail("invalid-id");

    expect(result).toBeNull();
  });

  it("returns null from getAdminTransactionDetail when transaction does not exist", async () => {
    transactionModelMock.findById.mockReturnValue(mockMongooseModel(null));

    const result = await getAdminTransactionDetail("507f1f77bcf86cd799439013");

    expect(result).toBeNull();
  });

  it("returns transaction detail with user payload when records exist", async () => {
    const transaction = createTestTransaction({
      _id: "507f1f77bcf86cd799439013",
      userId: "507f1f77bcf86cd799439011",
      amount: 3900,
      plan: "Premium",
    });

    transactionModelMock.findById.mockReturnValue(
      mockMongooseModel(transaction),
    );
    userModelMock.findById.mockReturnValue(
      mockMongooseModel({
        _id: "507f1f77bcf86cd799439011",
        username: "test-user",
        email: "test.user@example.com",
        role: "client",
        suspended: false,
        plan: {
          name: "Premium",
          amount: 3900,
        },
      }),
    );

    const result = await getAdminTransactionDetail("507f1f77bcf86cd799439013");

    expect(result).toEqual(
      expect.objectContaining({
        id: "507f1f77bcf86cd799439013",
        amount: 3900,
        plan: "Premium",
        user: expect.objectContaining({
          username: "test-user",
          currentPlan: "Premium",
          currentPlanAmount: 3900,
        }),
      }),
    );
  });

  it("returns usage analytics aggregates with configured persona labels", async () => {
    usageEventModelMock.aggregate
      .mockResolvedValueOnce([
        {
          totalEvents: 10,
          blockedEvents: 2,
          totalCostCents: 120,
          totalTokensIn: 800,
          totalTokensOut: 400,
        },
      ])
      .mockResolvedValueOnce([{ _id: "user_123", count: 5, costCents: 80 }])
      .mockResolvedValueOnce([
        { _id: "strategist", count: 6 },
        { _id: "developer", count: 2 },
      ])
      .mockResolvedValueOnce([{ _id: "gpt-4.1", count: 8, costCents: 110 }])
      .mockResolvedValueOnce([{ _id: "chat", count: 7, costCents: 90 }])
      .mockResolvedValueOnce([{ _id: "2026-03-24", count: 9 }])
      .mockResolvedValueOnce([{ _id: "openai", count: 10, costCents: 120 }]);

    userModelMock.find.mockReturnValue(
      mockMongooseModel([
        {
          clerkId: "user_123",
          username: "test-user",
          email: "test.user@example.com",
        },
      ]),
    );

    const result = await getAdminUsageAnalytics();

    expect(result.summary).toEqual(
      expect.objectContaining({
        totalEvents: 10,
        blockedEvents: 2,
      }),
    );
    expect(result.topUsers).toEqual([
      expect.objectContaining({
        userId: "user_123",
        username: "test-user",
        email: "test.user@example.com",
      }),
    ]);
    expect(result.topPersonas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personaId: "strategist",
          label: "Strategist (Configured)",
          percentage: 60,
        }),
        expect.objectContaining({
          personaId: "developer",
          label: "Developer",
        }),
      ]),
    );
    expect(result.byModel).toEqual([
      { label: "gpt-4.1", count: 8, costCents: 110 },
    ]);
  });

  it("returns settings snapshot with keyed settings and defaults", async () => {
    appSettingModelMock.find.mockReturnValue(
      mockMongooseModel([
        {
          key: "support.email",
          value: "support@example.com",
          category: "support",
          updatedBy: "admin_1",
        },
      ]),
    );

    const result = await getAdminSettingsSnapshot();

    expect(result.settingsByKey["support.email"]).toEqual(
      expect.objectContaining({
        value: "support@example.com",
      }),
    );
    expect(result.defaults).toEqual(
      expect.objectContaining({
        models: expect.any(Object),
        pricing: expect.objectContaining({
          proPrice: expect.any(Number),
          premiumPrice: expect.any(Number),
        }),
        limits: expect.any(Object),
        personaAccess: expect.any(Object),
      }),
    );
  });

  it("returns mapped website pages list", async () => {
    publicPageModelMock.find.mockReturnValue(
      mockMongooseModel([
        {
          _id: "507f1f77bcf86cd799439099",
          slug: "about",
          title: "About",
          sortOrder: 2,
          isPublished: true,
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedBy: "admin_1",
        },
      ]),
    );

    const result = await getAdminWebsitePages();

    expect(result).toEqual([
      expect.objectContaining({
        id: "507f1f77bcf86cd799439099",
        slug: "about",
        title: "About",
        sortOrder: 2,
        isPublished: true,
      }),
    ]);
  });

  it("returns null from getAdminPublicPage for invalid ids or missing records", async () => {
    isValidObjectIdMock.mockReturnValue(false);
    expect(await getAdminPublicPage("invalid-id")).toBeNull();

    isValidObjectIdMock.mockReturnValue(true);
    publicPageModelMock.findById.mockReturnValue(mockMongooseModel(null));
    expect(await getAdminPublicPage("507f1f77bcf86cd799439099")).toBeNull();
  });

  it("returns mapped admin public page details when found", async () => {
    publicPageModelMock.findById.mockReturnValue(
      mockMongooseModel({
        _id: "507f1f77bcf86cd799439099",
        slug: "privacy",
        title: "Privacy Policy",
        content: "Page content",
        sortOrder: 3,
        isPublished: false,
        updatedAt: new Date("2026-03-02T00:00:00.000Z"),
        updatedBy: "admin_1",
      }),
    );

    const result = await getAdminPublicPage("507f1f77bcf86cd799439099");

    expect(result).toEqual(
      expect.objectContaining({
        id: "507f1f77bcf86cd799439099",
        slug: "privacy",
        title: "Privacy Policy",
        content: "Page content",
        sortOrder: 3,
        isPublished: false,
      }),
    );
  });
});
