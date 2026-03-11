import { plans, PLAN_LIMITS } from "@/constants/plans";
import { MODEL_POLICY_MATRIX } from "@/lib/utils/ai-model-policy";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import User from "@/lib/database/models/user.model";
import { PlanName } from "@/types/PlanData.d";
import { isValidObjectId } from "mongoose";

type UserRecord = {
  _id: unknown;
  clerkId: string;
  username: string;
  email: string;
  role: string;
  suspended?: boolean;
  registerAt?: Date | string;
  firstName?: string;
  lastName?: string;
  updatedAt?: Date | string;
  userimg?: string;
  plan?: {
    name?: PlanName;
    amount?: number;
    billing?: string;
    expiresOn?: Date | string;
    stripeId?: string;
    imageGenerations?: number;
    audioGenerations?: number;
  };
};

type TransactionRecord = {
  _id: unknown;
  userId: unknown;
  clerkId: string;
  stripeId: string;
  createdAt?: Date | string;
  expiresOn?: Date | string;
  amount?: number;
  plan?: string;
  billing?: string;
};

type PublicPageRecord = {
  _id: unknown;
  slug: string;
  title: string;
  content: string;
  sortOrder?: number;
  isPublished?: boolean;
  updatedAt?: Date | string;
  updatedBy: string;
};

type AppSettingRecord = {
  _id?: unknown;
  key: string;
  value: unknown;
  category: string;
  updatedAt?: Date | string;
  updatedBy: string;
};

type UsageAggregateRecord = {
  _id: string;
  count: number;
  costCents?: number;
  tokensIn?: number;
  tokensOut?: number;
};

function toIsoString(value?: Date | string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toAdminUserListItem(user: UserRecord) {
  return {
    id: String(user._id),
    clerkId: user.clerkId,
    username: user.username,
    email: user.email,
    role: user.role,
    suspended: Boolean(user.suspended),
    planName: user.plan?.name ?? "Lite",
    registerAt: toIsoString(user.registerAt),
  };
}

export async function getAdminDashboardStats() {
  await connectToDatabase();

  const [usersCount, conversationsCount, paidTransactionsCount, usageEvents] =
    await Promise.all([
      User.countDocuments({}),
      Task.countDocuments({}),
      Transaction.countDocuments({}),
      UsageEvent.countDocuments({}),
    ]);

  return [
    {
      label: "Users",
      value: usersCount,
      icon: "bi bi-people",
      href: "/admin/users",
    },
    {
      label: "Conversations",
      value: conversationsCount,
      icon: "bi bi-chat-left-text",
      href: "/admin/usage",
    },
    {
      label: "Transactions",
      value: paidTransactionsCount,
      icon: "bi bi-credit-card",
      href: "/admin/transactions",
    },
    {
      label: "Usage Events",
      value: usageEvents,
      icon: "bi bi-graph-up-arrow",
      href: "/admin/usage",
    },
  ];
}

export async function getAdminUsers(search?: string) {
  await connectToDatabase();

  const trimmedSearch = search?.trim();
  const filter = trimmedSearch
    ? {
        $or: [
          { username: { $regex: trimmedSearch, $options: "i" } },
          { email: { $regex: trimmedSearch, $options: "i" } },
        ],
      }
    : {};
  const users = (await User.find(filter)
    .sort({ registerAt: -1 })
    .select(
      "clerkId username email role suspended registerAt plan.name firstName lastName",
    )
    .lean()) as UserRecord[];

  return users.map(toAdminUserListItem);
}

export async function getAdminUserDetail(userId: string) {
  if (!isValidObjectId(userId)) {
    return null;
  }

  await connectToDatabase();

  const user = (await User.findById(userId)
    .select(
      "clerkId username email role suspended registerAt plan firstName lastName updatedAt userimg",
    )
    .lean()) as UserRecord | null;

  if (!user) {
    return null;
  }

  const [conversationCount, transactions] = await Promise.all([
    Task.countDocuments({ userId: user.clerkId }),
    Transaction.find({ clerkId: user.clerkId })
      .sort({ createdAt: -1 })
      .select("stripeId createdAt expiresOn amount plan billing")
      .lean(),
  ]);
  const typedTransactions = transactions as TransactionRecord[];

  return {
    ...toAdminUserListItem(user),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    updatedAt: toIsoString(user.updatedAt),
    userimg: user.userimg ?? null,
    planAmount: user.plan?.amount ?? 0,
    billing: user.plan?.billing ?? "Monthly",
    expiresOn: toIsoString(user.plan?.expiresOn),
    imageGenerations: user.plan?.imageGenerations ?? 0,
    audioGenerations: user.plan?.audioGenerations ?? 0,
    conversationCount,
    transactions: typedTransactions.map((transaction) => ({
      id: String(transaction._id),
      stripeId: transaction.stripeId,
      createdAt: toIsoString(transaction.createdAt),
      expiresOn: toIsoString(transaction.expiresOn),
      amount: transaction.amount ?? 0,
      plan: transaction.plan ?? "Lite",
      billing: transaction.billing ?? "Monthly",
    })),
  };
}

export async function getAdminTransactions() {
  await connectToDatabase();

  const transactions = (await Transaction.find({})
    .sort({ createdAt: -1 })
    .select("userId clerkId stripeId createdAt expiresOn amount plan billing")
    .lean()) as TransactionRecord[];
  const userIds = [
    ...new Set(transactions.map((transaction) => String(transaction.userId))),
  ];
  const users = (await User.find({ _id: { $in: userIds } })
    .select("username email")
    .lean()) as Array<{ _id: unknown; username: string; email: string }>;
  const userMap = new Map(
    users.map((user) => [
      String(user._id),
      { username: user.username, email: user.email },
    ]),
  );

  return transactions.map((transaction) => {
    const user = userMap.get(String(transaction.userId));
    const isActive =
      transaction.expiresOn && new Date(transaction.expiresOn) > new Date();

    return {
      id: String(transaction._id),
      clerkId: transaction.clerkId,
      stripeId: transaction.stripeId,
      createdAt: toIsoString(transaction.createdAt),
      expiresOn: toIsoString(transaction.expiresOn),
      amount: transaction.amount ?? 0,
      plan: transaction.plan ?? "Lite",
      billing: transaction.billing ?? "Monthly",
      status: isActive ? "Active" : "Expired",
      username: user?.username ?? "Unknown user",
      email: user?.email ?? "Unknown email",
    };
  });
}

export async function getAdminTransactionDetail(transactionId: string) {
  if (!isValidObjectId(transactionId)) {
    return null;
  }

  await connectToDatabase();

  const transaction = (await Transaction.findById(transactionId)
    .select("userId clerkId stripeId createdAt expiresOn amount plan billing")
    .lean()) as TransactionRecord | null;

  if (!transaction) {
    return null;
  }

  const user = (await User.findById(transaction.userId)
    .select("username email role suspended plan.name plan.amount")
    .lean()) as {
    _id: unknown;
    username: string;
    email: string;
    role: string;
    suspended?: boolean;
    plan?: { name?: PlanName; amount?: number };
  } | null;

  return {
    id: String(transaction._id),
    clerkId: transaction.clerkId,
    stripeId: transaction.stripeId,
    createdAt: toIsoString(transaction.createdAt),
    expiresOn: toIsoString(transaction.expiresOn),
    amount: transaction.amount ?? 0,
    plan: transaction.plan ?? "Lite",
    billing: transaction.billing ?? "Monthly",
    user: user
      ? {
          id: String(user._id),
          username: user.username,
          email: user.email,
          role: user.role,
          suspended: Boolean(user.suspended),
          currentPlan: user.plan?.name ?? "Lite",
          currentPlanAmount: user.plan?.amount ?? 0,
        }
      : null,
  };
}

export async function getAdminUsageAnalytics() {
  await connectToDatabase();

  const [
    summaryAggregate,
    topUsersAggregate,
    byModel,
    byRequestType,
    byDay,
    byProvider,
  ] = await Promise.all([
    UsageEvent.aggregate([
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          blockedEvents: {
            $sum: {
              $cond: [{ $eq: ["$blocked", true] }, 1, 0],
            },
          },
          totalCostCents: {
            $sum: {
              $ifNull: ["$estimatedCost", 0],
            },
          },
          totalTokensIn: {
            $sum: {
              $ifNull: ["$tokensIn", 0],
            },
          },
          totalTokensOut: {
            $sum: {
              $ifNull: ["$tokensOut", 0],
            },
          },
        },
      },
    ]),
    UsageEvent.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          costCents: {
            $sum: {
              $ifNull: ["$estimatedCost", 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    UsageEvent.aggregate([
      {
        $group: {
          _id: "$model",
          count: { $sum: 1 },
          costCents: {
            $sum: {
              $ifNull: ["$estimatedCost", 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),
    UsageEvent.aggregate([
      {
        $group: {
          _id: "$requestType",
          count: { $sum: 1 },
          costCents: {
            $sum: {
              $ifNull: ["$estimatedCost", 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),
    UsageEvent.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    UsageEvent.aggregate([
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
          costCents: {
            $sum: {
              $ifNull: ["$estimatedCost", 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);
  const typedTopUsers = topUsersAggregate as UsageAggregateRecord[];
  const topUserIds = typedTopUsers.map((item) => item._id);
  const topUsers = (await User.find({ clerkId: { $in: topUserIds } })
    .select("clerkId username email")
    .lean()) as Array<{ clerkId: string; username: string; email: string }>;
  const topUserMap = new Map(
    topUsers.map((user) => [
      user.clerkId,
      { username: user.username, email: user.email },
    ]),
  );
  const summary = summaryAggregate[0] ?? {
    totalEvents: 0,
    blockedEvents: 0,
    totalCostCents: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
  };

  return {
    summary,
    topUsers: typedTopUsers.map((item) => ({
      userId: item._id,
      username: topUserMap.get(item._id)?.username ?? item._id,
      email: topUserMap.get(item._id)?.email ?? "Unknown email",
      count: item.count,
      costCents: item.costCents ?? 0,
    })),
    byModel: (byModel as UsageAggregateRecord[]).map((item) => ({
      label: item._id,
      count: item.count,
      costCents: item.costCents ?? 0,
    })),
    byRequestType: (byRequestType as UsageAggregateRecord[]).map((item) => ({
      label: item._id,
      count: item.count,
      costCents: item.costCents ?? 0,
    })),
    byDay: (byDay as UsageAggregateRecord[]).map((item) => ({
      label: item._id,
      count: item.count,
    })),
    byProvider: (byProvider as UsageAggregateRecord[]).map((item) => ({
      label: item._id,
      count: item.count,
      costCents: item.costCents ?? 0,
    })),
  };
}

export async function getAdminSettingsSnapshot() {
  await connectToDatabase();

  const settings = (await AppSetting.find({})
    .sort({ category: 1, key: 1 })
    .select("key value category updatedAt updatedBy")
    .lean()) as AppSettingRecord[];
  const settingsByKey = Object.fromEntries(
    settings.map((setting) => [setting.key, setting]),
  );

  return {
    settingsByKey,
    defaults: {
      models: MODEL_POLICY_MATRIX,
      pricing: plans.map((plan) => ({
        name: plan.name,
        price: plan.price,
        description: plan.desc,
      })),
      limits: PLAN_LIMITS,
      theme: {
        defaultMode: "light",
      },
    },
  };
}

export async function getAdminWebsitePages() {
  await connectToDatabase();

  const pages = (await PublicPage.find({})
    .sort({ sortOrder: 1, updatedAt: -1 })
    .select("slug title sortOrder isPublished updatedAt updatedBy")
    .lean()) as PublicPageRecord[];

  return pages.map((page) => ({
    id: String(page._id),
    slug: page.slug,
    title: page.title,
    sortOrder: page.sortOrder ?? 0,
    isPublished: Boolean(page.isPublished),
    updatedAt: toIsoString(page.updatedAt),
    updatedBy: page.updatedBy,
  }));
}

export async function getAdminPublicPage(pageId: string) {
  if (!isValidObjectId(pageId)) {
    return null;
  }

  await connectToDatabase();

  const page = (await PublicPage.findById(pageId)
    .select("slug title content sortOrder isPublished updatedAt updatedBy")
    .lean()) as PublicPageRecord | null;

  if (!page) {
    return null;
  }

  return {
    id: String(page._id),
    slug: page.slug,
    title: page.title,
    content: page.content,
    sortOrder: page.sortOrder ?? 0,
    isPublished: Boolean(page.isPublished),
    updatedAt: toIsoString(page.updatedAt),
    updatedBy: page.updatedBy,
  };
}
