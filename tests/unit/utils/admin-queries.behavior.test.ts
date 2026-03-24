import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import User from "@/lib/database/models/user.model";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import {
  getAdminDashboardStats,
  getAdminPublicPage,
  getAdminSettingsSnapshot,
  getAdminTransactionDetail,
  getAdminUsageAnalytics,
  getAdminUserDetail,
  getAdminWebsitePages,
} from "@/lib/utils/admin-queries";

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

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
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

function buildSelectLeanQuery<T>(value: T) {
  const lean = vi.fn().mockResolvedValue(value as never);
  const select = vi.fn().mockReturnValue({ lean });
  return { select } as never;
}

describe("admin-queries behavior coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("builds dashboard stats from aggregate counters", async () => {
    vi.mocked(User.countDocuments).mockResolvedValue(11);
    vi.mocked(Task.countDocuments).mockResolvedValue(22);
    vi.mocked(Transaction.countDocuments).mockResolvedValue(7);
    vi.mocked(UsageEvent.countDocuments)
      .mockResolvedValueOnce(140)
      .mockResolvedValueOnce(41)
      .mockResolvedValueOnce(17)
      .mockResolvedValueOnce(5);

    const stats = await getAdminDashboardStats();

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(stats).toEqual([
      expect.objectContaining({ label: "Users", value: 11 }),
      expect.objectContaining({ label: "Conversations", value: 22 }),
      expect.objectContaining({ label: "Transactions", value: 7 }),
      expect.objectContaining({ label: "Usage Events", value: 140 }),
      expect.objectContaining({ label: "Images Generated", value: 41 }),
      expect.objectContaining({ label: "Audio Generated", value: 17 }),
      expect.objectContaining({ label: "Video Generated", value: 5 }),
    ]);
  });

  describe("getAdminUserDetail", () => {
    const validUserId = "507f1f77bcf86cd799439011";

    beforeEach(() => {
      vi.mocked(getEffectivePlanConfig).mockResolvedValue({
        pricing: {
          Lite: 0,
          Pro: 19,
          Premium: 39,
          currencySymbol: "$",
        },
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
        trialLimits: {
          promptsPerConversation: 5,
          images: 3,
          audio: 2,
          video: 1,
        },
      } as never);
    });

    it("returns null for invalid object id", async () => {
      const detail = await getAdminUserDetail("not-an-object-id");

      expect(detail).toBeNull();
      expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it("returns null when the user does not exist", async () => {
      vi.mocked(User.findById).mockReturnValue(buildSelectLeanQuery(null));

      const detail = await getAdminUserDetail(validUserId);

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(detail).toBeNull();
    });

    it("maps usage, limits, and transaction details for an existing user", async () => {
      vi.mocked(User.findById).mockReturnValue(
        buildSelectLeanQuery({
          _id: "mongo_user_1",
          clerkId: "clerk_1",
          username: "alice",
          email: "alice@example.com",
          role: "client",
          registerAt: "2026-03-01T00:00:00.000Z",
          dailyConversationsStarted: 4,
          plan: {
            name: "Lite",
            amount: 0,
            billing: "Monthly",
            expiresOn: "2026-04-01T00:00:00.000Z",
            imageGenerations: 2,
            audioGenerations: 1,
            videoGenerations: 1,
            trialUsage: {
              trialImageGenerations: 1,
              trialAudioGenerations: 1,
              trialVideoGenerations: 0,
            },
          },
        }),
      );
      vi.mocked(Task.countDocuments).mockResolvedValue(6);
      vi.mocked(Task.aggregate).mockResolvedValue([
        { totalPromptCount: 42, maxPromptCount: 8 },
      ]);
      const transactionsLean = vi.fn().mockResolvedValue([
        {
          _id: "txn_1",
          userId: "mongo_user_1",
          clerkId: "clerk_1",
          stripeId: "stripe_1",
          createdAt: "2026-03-10T00:00:00.000Z",
          expiresOn: "2026-04-10T00:00:00.000Z",
          amount: 19,
          plan: "Pro",
          billing: "Monthly",
        },
      ]);
      const transactionsSelect = vi.fn().mockReturnValue({
        lean: transactionsLean,
      });
      const transactionsSort = vi.fn().mockReturnValue({
        select: transactionsSelect,
      });
      vi.mocked(Transaction.find).mockReturnValue({
        sort: transactionsSort,
      } as never);

      const detail = await getAdminUserDetail(validUserId);

      expect(detail).toEqual(
        expect.objectContaining({
          id: "mongo_user_1",
          clerkId: "clerk_1",
          conversationCount: 6,
          conversationUsage: {
            used: 4,
            limit: 5,
            remaining: 1,
          },
          promptUsage: {
            used: 8,
            total: 42,
            limit: 10,
            remaining: 2,
          },
          mediaUsage: {
            images: { used: 2, limit: 3, remaining: 1 },
            audio: { used: 1, limit: 3, remaining: 2 },
            video: { used: 1, limit: 1, remaining: 0 },
          },
          trialUsage: {
            images: { used: 1, limit: 3, remaining: 2 },
            audio: { used: 1, limit: 2, remaining: 1 },
            video: { used: 0, limit: 1, remaining: 1 },
          },
          transactions: [
            expect.objectContaining({
              id: "txn_1",
              stripeId: "stripe_1",
              amount: 19,
              plan: "Pro",
            }),
          ],
        }),
      );
    });
  });

  describe("getAdminTransactionDetail", () => {
    const validTransactionId = "507f1f77bcf86cd799439012";

    it("returns null for invalid object id", async () => {
      const detail = await getAdminTransactionDetail("invalid-id");

      expect(detail).toBeNull();
      expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it("returns null when transaction does not exist", async () => {
      vi.mocked(Transaction.findById).mockReturnValue(
        buildSelectLeanQuery(null),
      );

      const detail = await getAdminTransactionDetail(validTransactionId);

      expect(detail).toBeNull();
    });

    it("returns transaction with null user when linked user is missing", async () => {
      vi.mocked(Transaction.findById).mockReturnValue(
        buildSelectLeanQuery({
          _id: "txn_1",
          userId: "mongo_user_404",
          clerkId: "clerk_1",
          stripeId: "stripe_1",
          createdAt: "2026-03-01T00:00:00.000Z",
          expiresOn: "2026-03-31T00:00:00.000Z",
          amount: 19,
          plan: "Pro",
          billing: "Monthly",
        }),
      );
      vi.mocked(User.findById).mockReturnValue(buildSelectLeanQuery(null));

      const detail = await getAdminTransactionDetail(validTransactionId);

      expect(detail).toEqual(
        expect.objectContaining({
          id: "txn_1",
          user: null,
        }),
      );
    });
  });

  it("aggregates usage analytics with persona labels and user enrichment", async () => {
    vi.mocked(UsageEvent.aggregate)
      .mockResolvedValueOnce([
        {
          totalEvents: 100,
          blockedEvents: 12,
          totalCostCents: 3456,
          totalTokensIn: 12000,
          totalTokensOut: 9000,
        },
      ])
      .mockResolvedValueOnce([
        { _id: "clerk_1", count: 30, costCents: 1200 },
        { _id: "clerk_2", count: 10, costCents: 300 },
      ])
      .mockResolvedValueOnce([
        { _id: "strategist", count: 40 },
        { _id: "teacher", count: 20 },
      ])
      .mockResolvedValueOnce([{ _id: "gpt-4.1", count: 50, costCents: 2100 }])
      .mockResolvedValueOnce([{ _id: "chat", count: 70, costCents: 2500 }])
      .mockResolvedValueOnce([{ _id: "2026-03-20", count: 25 }])
      .mockResolvedValueOnce([{ _id: "openai", count: 100, costCents: 3456 }]);
    const topUsersLean = vi.fn().mockResolvedValue([
      { clerkId: "clerk_1", username: "alice", email: "alice@example.com" },
      { clerkId: "clerk_2", username: "bob", email: "bob@example.com" },
    ]);
    const topUsersSelect = vi.fn().mockReturnValue({ lean: topUsersLean });
    vi.mocked(User.find).mockReturnValue({ select: topUsersSelect } as never);
    vi.mocked(getEffectivePersonaConfig).mockResolvedValue([
      {
        id: "strategist",
        label: "Strategic Advisor",
        tagline: "tagline",
        description: "description",
        category: "strategy",
        icon: "bi bi-lightbulb",
        color: "blue",
        heroImage: "/hero.png",
        starterPrompts: ["one"],
        purpose: "purpose",
        defaultModelHint: "gpt-4.1",
      },
    ] as never);

    const analytics = await getAdminUsageAnalytics();

    expect(analytics.summary).toEqual(
      expect.objectContaining({
        totalEvents: 100,
        blockedEvents: 12,
      }),
    );
    expect(analytics.topUsers).toEqual([
      expect.objectContaining({
        userId: "clerk_1",
        username: "alice",
        email: "alice@example.com",
      }),
      expect.objectContaining({
        userId: "clerk_2",
        username: "bob",
        email: "bob@example.com",
      }),
    ]);
    expect(analytics.topPersonas).toEqual([
      expect.objectContaining({
        personaId: "strategist",
        label: "Strategic Advisor",
        count: 40,
      }),
      expect.objectContaining({
        personaId: "teacher",
        count: 20,
      }),
    ]);
    expect(analytics.byModel).toEqual([
      { label: "gpt-4.1", count: 50, costCents: 2100 },
    ]);
    expect(analytics.byRequestType).toEqual([
      { label: "chat", count: 70, costCents: 2500 },
    ]);
    expect(analytics.byDay).toEqual([{ label: "2026-03-20", count: 25 }]);
    expect(analytics.byProvider).toEqual([
      { label: "openai", count: 100, costCents: 3456 },
    ]);
  });

  it("returns settings snapshot with persisted settings and defaults", async () => {
    const settingsLean = vi.fn().mockResolvedValue([
      {
        _id: "setting_1",
        key: "admin.supportEmail",
        value: "help@droplet.ai",
        category: "features",
        updatedBy: "admin_clerk_1",
      },
    ]);
    const settingsSelect = vi.fn().mockReturnValue({ lean: settingsLean });
    const settingsSort = vi.fn().mockReturnValue({ select: settingsSelect });
    vi.mocked(AppSetting.find).mockReturnValue({ sort: settingsSort } as never);

    const snapshot = await getAdminSettingsSnapshot();

    expect(snapshot.settingsByKey).toEqual({
      "admin.supportEmail": expect.objectContaining({
        key: "admin.supportEmail",
        value: "help@droplet.ai",
      }),
    });
    expect(snapshot.defaults.pricing).toEqual(
      expect.objectContaining({
        proPrice: expect.any(Number),
        premiumPrice: expect.any(Number),
        currencySymbol: expect.any(String),
      }),
    );
    expect(snapshot.defaults.theme).toEqual({ defaultMode: "light" });
    expect(snapshot.defaults.support).toEqual(
      expect.objectContaining({
        supportEmail: expect.any(String),
      }),
    );
  });

  it("maps website page list and applies defaults", async () => {
    const pagesLean = vi.fn().mockResolvedValue([
      {
        _id: "page_1",
        slug: "about",
        title: "About",
        updatedAt: "2026-03-01T00:00:00.000Z",
        updatedBy: "admin_1",
      },
    ]);
    const pagesSelect = vi.fn().mockReturnValue({ lean: pagesLean });
    const pagesSort = vi.fn().mockReturnValue({ select: pagesSelect });
    vi.mocked(PublicPage.find).mockReturnValue({ sort: pagesSort } as never);

    const pages = await getAdminWebsitePages();

    expect(pages).toEqual([
      {
        id: "page_1",
        slug: "about",
        title: "About",
        sortOrder: 0,
        isPublished: false,
        updatedAt: "2026-03-01T00:00:00.000Z",
        updatedBy: "admin_1",
      },
    ]);
  });

  describe("getAdminPublicPage", () => {
    const validPageId = "507f1f77bcf86cd799439013";

    it("returns null for invalid page id", async () => {
      const page = await getAdminPublicPage("invalid-page-id");

      expect(page).toBeNull();
      expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it("returns null for missing page", async () => {
      vi.mocked(PublicPage.findById).mockReturnValue(
        buildSelectLeanQuery(null),
      );

      const page = await getAdminPublicPage(validPageId);

      expect(page).toBeNull();
    });

    it("returns mapped page when found", async () => {
      vi.mocked(PublicPage.findById).mockReturnValue(
        buildSelectLeanQuery({
          _id: "page_1",
          slug: "privacy",
          title: "Privacy Policy",
          content: "<p>privacy</p>",
          sortOrder: 3,
          isPublished: true,
          updatedAt: "2026-03-05T00:00:00.000Z",
          updatedBy: "admin_clerk_1",
        }),
      );

      const page = await getAdminPublicPage(validPageId);

      expect(page).toEqual({
        id: "page_1",
        slug: "privacy",
        title: "Privacy Policy",
        content: "<p>privacy</p>",
        sortOrder: 3,
        isPublished: true,
        updatedAt: "2026-03-05T00:00:00.000Z",
        updatedBy: "admin_clerk_1",
      });
    });
  });
});
