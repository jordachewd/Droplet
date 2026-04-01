import "server-only";

import { getDefaultAboutContent } from "@/constants/about-data";
import { buildFaqs } from "@/constants/faqs";
import { getDefaultHeroContent } from "@/constants/hero-content";
import { getDefaultLandingContent } from "@/constants/landing-data";
import { DEFAULT_PROMO_CONTENT } from "@/constants/promo-content";
import {
  DEFAULT_PLAN_PRICING,
  PERSONA_TRIAL_LIMITS,
  PLAN_LIMITS,
  PlanLimits,
} from "@/constants/plans";
import { STOP_REASON_MESSAGES } from "@/constants/stop-reasons";
import { SUPPORT_EMAIL } from "@/constants/support";
import { DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN } from "@/lib/utils/resolve-entitlements";
import { getPersona, PERSONAS } from "@/constants/assistant-personas";
import { MODEL_POLICY_MATRIX } from "@/lib/utils/ai-model-policy";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import User from "@/lib/database/models/user.model";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaConfig } from "@/lib/utils/effective-persona-config";
import { PersonaId } from "@/types/PersonaData.d";
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
  dailyConversationsStarted?: number;
  plan?: {
    name?: PlanName;
    amount?: number;
    billing?: string;
    expiresOn?: Date | string;
    stripeId?: string;
    imageGenerations?: number;
    audioGenerations?: number;
    videoGenerations?: number;
    trialUsage?: {
      trialImageGenerations?: number;
      trialAudioGenerations?: number;
      trialVideoGenerations?: number;
    };
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

const DEFAULT_ADMIN_PAGE_SIZE = 25;
const MAX_ADMIN_PAGE_SIZE = 100;

type AdminPaginationResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  skip: number;
};

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);

  if (normalized < 1) {
    return fallback;
  }

  return normalized;
}

function resolveAdminPagination(
  total: number,
  page?: number,
  pageSize = DEFAULT_ADMIN_PAGE_SIZE,
): AdminPaginationResult {
  const safePageSize = Math.min(
    MAX_ADMIN_PAGE_SIZE,
    normalizePositiveInt(pageSize, DEFAULT_ADMIN_PAGE_SIZE),
  );
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const requestedPage = normalizePositiveInt(page, 1);
  const safePage = Math.min(requestedPage, totalPages);

  return {
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    skip: (safePage - 1) * safePageSize,
  };
}

function toIsoString(value?: Date | string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toAdminUserListItem(user: UserRecord) {
  const planName = user.plan?.name ?? "Lite";

  return {
    id: String(user._id),
    clerkId: user.clerkId,
    username: user.username,
    email: user.email,
    role: user.role,
    suspended: Boolean(user.suspended),
    planName,
    registerAt: toIsoString(user.registerAt),
  };
}

export async function getAdminDashboardStats() {
  await connectToDatabase();

  const [
    usersCount,
    conversationsCount,
    paidTransactionsCount,
    usageEvents,
    imageGenerations,
    audioGenerations,
    videoGenerations,
  ] = await Promise.all([
    User.countDocuments({}),
    Task.countDocuments({}),
    Transaction.countDocuments({}),
    UsageEvent.countDocuments({}),
    UsageEvent.countDocuments({ requestType: "image", blocked: false }),
    UsageEvent.countDocuments({ requestType: "audio", blocked: false }),
    UsageEvent.countDocuments({ requestType: "video", blocked: false }),
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
    {
      label: "Images Generated",
      value: imageGenerations,
      icon: "bi bi-image",
      href: "/admin/usage",
    },
    {
      label: "Audio Generated",
      value: audioGenerations,
      icon: "bi bi-mic",
      href: "/admin/usage",
    },
    {
      label: "Video Generated",
      value: videoGenerations,
      icon: "bi bi-camera-video",
      href: "/admin/usage",
    },
  ];
}

export async function getAdminUsers(
  search?: string,
  page = 1,
  pageSize = DEFAULT_ADMIN_PAGE_SIZE,
) {
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
  const [total, effectivePlanConfig] = await Promise.all([
    User.countDocuments(filter),
    getEffectivePlanConfig(),
  ]);
  const pagination = resolveAdminPagination(total, page, pageSize);
  const users = await User.find(filter)
    .sort({ registerAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .select(
      "clerkId username email role suspended registerAt dailyConversationsStarted plan.name plan.imageGenerations plan.audioGenerations plan.videoGenerations firstName lastName",
    )
    .lean();

  const typedUsers = users as UserRecord[];

  return {
    items: typedUsers.map((user) => {
      const baseItem = toAdminUserListItem(user);
      const planName = user.plan?.name ?? "Lite";
      const planLimits = effectivePlanConfig.limits[planName];

      return {
        ...baseItem,
        mediaUsage: {
          images: {
            used: user.plan?.imageGenerations ?? 0,
            limit: planLimits.images,
          },
          audio: {
            used: user.plan?.audioGenerations ?? 0,
            limit: planLimits.audio,
          },
          video: {
            used: user.plan?.videoGenerations ?? 0,
            limit: planLimits.video,
          },
        },
        conversationUsage: {
          used: user.dailyConversationsStarted ?? 0,
          limit: planLimits.conversationsPerDay,
        },
      };
    }),
    total: pagination.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
  };
}

export async function getAdminUserDetail(userId: string) {
  if (!isValidObjectId(userId)) {
    return null;
  }

  await connectToDatabase();

  const user = (await User.findById(userId)
    .select(
      "clerkId username email role suspended registerAt plan firstName lastName updatedAt userimg dailyConversationsStarted",
    )
    .lean()) as UserRecord | null;

  if (!user) {
    return null;
  }

  const [conversationCount, promptMetrics, transactions, effectivePlanConfig] =
    await Promise.all([
      Task.countDocuments({ userId: user.clerkId }),
      Task.aggregate([
        {
          $match: {
            userId: user.clerkId,
          },
        },
        {
          $group: {
            _id: null,
            totalPromptCount: { $sum: "$promptCount" },
            maxPromptCount: { $max: "$promptCount" },
          },
        },
      ]),
      Transaction.find({ clerkId: user.clerkId })
        .sort({ createdAt: -1 })
        .select("stripeId createdAt expiresOn amount plan billing")
        .lean(),
      getEffectivePlanConfig(),
    ]);
  const typedTransactions = transactions as TransactionRecord[];
  const promptUsageAggregate =
    (promptMetrics[0] as
      | { totalPromptCount?: number; maxPromptCount?: number }
      | undefined) ?? {};
  const resolvedPlanName = user.plan?.name ?? "Lite";
  const planLimits = effectivePlanConfig.limits[resolvedPlanName];
  const trialLimits = effectivePlanConfig.trialLimits;
  const imageGenerations = user.plan?.imageGenerations ?? 0;
  const audioGenerations = user.plan?.audioGenerations ?? 0;
  const videoGenerations = user.plan?.videoGenerations ?? 0;
  const trialImageGenerations =
    user.plan?.trialUsage?.trialImageGenerations ?? 0;
  const trialAudioGenerations =
    user.plan?.trialUsage?.trialAudioGenerations ?? 0;
  const trialVideoGenerations =
    user.plan?.trialUsage?.trialVideoGenerations ?? 0;
  const dailyConversationsStarted = user.dailyConversationsStarted ?? 0;
  const maxPromptCount = promptUsageAggregate.maxPromptCount ?? 0;
  const totalPromptCount = promptUsageAggregate.totalPromptCount ?? 0;

  return {
    ...toAdminUserListItem(user),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    updatedAt: toIsoString(user.updatedAt),
    userimg: user.userimg ?? null,
    planAmount: user.plan?.amount ?? 0,
    billing: user.plan?.billing ?? "Monthly",
    expiresOn: toIsoString(user.plan?.expiresOn),
    imageGenerations,
    audioGenerations,
    videoGenerations,
    mediaUsage: {
      images: {
        used: imageGenerations,
        limit: planLimits.images,
        remaining:
          planLimits.images === -1
            ? -1
            : Math.max(0, planLimits.images - imageGenerations),
      },
      audio: {
        used: audioGenerations,
        limit: planLimits.audio,
        remaining:
          planLimits.audio === -1
            ? -1
            : Math.max(0, planLimits.audio - audioGenerations),
      },
      video: {
        used: videoGenerations,
        limit: planLimits.video,
        remaining:
          planLimits.video === -1
            ? -1
            : Math.max(0, planLimits.video - videoGenerations),
      },
    },
    trialUsage: {
      images: {
        used: trialImageGenerations,
        limit: trialLimits.images,
        remaining: Math.max(0, trialLimits.images - trialImageGenerations),
      },
      audio: {
        used: trialAudioGenerations,
        limit: trialLimits.audio,
        remaining: Math.max(0, trialLimits.audio - trialAudioGenerations),
      },
      video: {
        used: trialVideoGenerations,
        limit: trialLimits.video,
        remaining: Math.max(0, trialLimits.video - trialVideoGenerations),
      },
    },
    conversationUsage: {
      used: dailyConversationsStarted,
      limit: planLimits.conversationsPerDay,
      remaining:
        planLimits.conversationsPerDay === -1
          ? -1
          : Math.max(
              0,
              planLimits.conversationsPerDay - dailyConversationsStarted,
            ),
    },
    promptUsage: {
      used: maxPromptCount,
      total: totalPromptCount,
      limit: planLimits.promptsPerConversation,
      remaining:
        planLimits.promptsPerConversation === -1
          ? -1
          : Math.max(0, planLimits.promptsPerConversation - maxPromptCount),
    },
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

export async function getAdminTransactions(
  page = 1,
  pageSize = DEFAULT_ADMIN_PAGE_SIZE,
) {
  await connectToDatabase();

  const total = await Transaction.countDocuments({});
  const pagination = resolveAdminPagination(total, page, pageSize);
  const transactions = (await Transaction.find({})
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .select("userId clerkId stripeId createdAt expiresOn amount plan billing")
    .lean()) as TransactionRecord[];
  const userIds = [
    ...new Set(transactions.map((transaction) => String(transaction.userId))),
  ];
  const users =
    userIds.length === 0
      ? []
      : ((await User.find({ _id: { $in: userIds } })
          .select("username email")
          .lean()) as Array<{ _id: unknown; username: string; email: string }>);
  const userMap = new Map(
    users.map((user) => [
      String(user._id),
      { username: user.username, email: user.email },
    ]),
  );

  return {
    items: transactions.map((transaction) => {
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
    }),
    total: pagination.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
  };
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
    topPersonasAggregate,
    byModel,
    byRequestType,
    byDay,
    byProvider,
    effectivePersonas,
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
        $match: {
          personaId: {
            $in: PERSONAS.map((persona) => persona.id),
          },
        },
      },
      {
        $group: {
          _id: "$personaId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
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
    getEffectivePersonaConfig(),
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
  const totalEvents = summary.totalEvents || 0;
  const typedTopPersonas = topPersonasAggregate as UsageAggregateRecord[];
  const effectivePersonaLabelById = new Map(
    effectivePersonas.map((persona) => [persona.id, persona.label]),
  );

  return {
    summary,
    topUsers: typedTopUsers.map((item) => ({
      userId: item._id,
      username: topUserMap.get(item._id)?.username ?? item._id,
      email: topUserMap.get(item._id)?.email ?? "Unknown email",
      count: item.count,
      costCents: item.costCents ?? 0,
    })),
    topPersonas: typedTopPersonas.map((item) => ({
      personaId: item._id,
      label:
        effectivePersonaLabelById.get(item._id as PersonaId) ??
        getPersona(item._id).label,
      count: item.count,
      percentage: totalEvents > 0 ? (item.count / totalEvents) * 100 : 0,
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
    .limit(500)
    .select("key value category updatedAt updatedBy")
    .lean()) as AppSettingRecord[];
  const settingsByKey = Object.fromEntries(
    settings.map((setting) => [setting.key, setting]),
  );

  return {
    settingsByKey,
    defaults: {
      models: {
        liteChatModel: MODEL_POLICY_MATRIX.lite.chat.taskClasses.standard.model,
        proChatModel: MODEL_POLICY_MATRIX.pro.chat.taskClasses.standard.model,
        premiumChatModel:
          MODEL_POLICY_MATRIX.premium.chat.taskClasses.standard.model,
        imageModel:
          MODEL_POLICY_MATRIX.pro.image_generation.taskClasses.final.model,
        audioModel:
          MODEL_POLICY_MATRIX.pro.audio_generation.taskClasses.final.model,
        videoModel:
          MODEL_POLICY_MATRIX.pro.video_generation.taskClasses.preview.model,
      },
      pricing: {
        proPrice: DEFAULT_PLAN_PRICING.Pro,
        premiumPrice: DEFAULT_PLAN_PRICING.Premium,
        currencySymbol: DEFAULT_PLAN_PRICING.currencySymbol,
      },
      limits: structuredClone(PLAN_LIMITS) as PlanLimits,
      trialLimits: { ...PERSONA_TRIAL_LIMITS },
      personaAccess: {
        Lite: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite],
        Pro: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro],
        Premium: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium],
      },
      personaContent: PERSONAS.reduce(
        (accumulator, persona) => {
          accumulator[persona.id] = {
            label: persona.label,
            tagline: persona.tagline,
            description: persona.description,
            starterPrompts: [...persona.starterPrompts],
          };
          return accumulator;
        },
        {} as Record<
          PersonaId,
          {
            label: string;
            tagline: string;
            description: string;
            starterPrompts: string[];
          }
        >,
      ),
      theme: {
        defaultMode: "light",
      },
      support: {
        supportEmail: SUPPORT_EMAIL,
      },
      stopReasonMessages: { ...STOP_REASON_MESSAGES },
      faqContent: buildFaqs(),
      heroContent: getDefaultHeroContent(),
      landingContent: getDefaultLandingContent(),
      aboutContent: getDefaultAboutContent(),
      promoContent: { ...DEFAULT_PROMO_CONTENT },
    },
  };
}

export async function getAdminWebsitePages() {
  await connectToDatabase();

  const pages = (await PublicPage.find({})
    .sort({ sortOrder: 1, updatedAt: -1 })
    .limit(500)
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
