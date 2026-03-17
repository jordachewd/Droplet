"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PERSONAS } from "@/constants/assistant-personas";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
import { PersonaId } from "@/types/PersonaData.d";
import { z } from "zod";

const requiredStringSchema = z.string().trim().min(1);
const numericFieldSchema = z.coerce.number().finite();
const adminSettingCategorySchema = z.enum([
  "plans",
  "models",
  "theme",
  "limits",
  "trial",
  "features",
]);
const currencySymbolSchema = z.enum(["$", "€"]);
const PERSONA_ACCESS_KEYS = new Set([
  "persona_access_lite",
  "persona_access_pro",
  "persona_access_premium",
]);
const VALID_PERSONA_ID_SET = new Set(PERSONAS.map((persona) => persona.id));

function getStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  const parsedValue = requiredStringSchema.safeParse(value);

  if (!parsedValue.success) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return parsedValue.data;
}

function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function getNumericField(formData: FormData, fieldName: string): number {
  const rawValue = getStringField(formData, fieldName);
  const parsedValue = numericFieldSchema.safeParse(rawValue);

  if (!parsedValue.success) {
    throw new Error(`Invalid numeric field: ${fieldName}`);
  }

  return parsedValue.data;
}

function parseStructuredAdminSettingValue({
  key,
  formData,
}: {
  key: string;
  formData: FormData;
}): unknown | null {
  if (key === "admin.models") {
    return {
      liteChatModel: getStringField(formData, "liteChatModel"),
      proChatModel: getStringField(formData, "proChatModel"),
      premiumChatModel: getStringField(formData, "premiumChatModel"),
      imageModel: getStringField(formData, "imageModel"),
      audioModel: getStringField(formData, "audioModel"),
    };
  }

  if (key === "admin.pricing") {
    return {
      proPrice: getNumericField(formData, "proPrice"),
      premiumPrice: getNumericField(formData, "premiumPrice"),
    };
  }

  if (key === "admin.currencySymbol") {
    const parsedCurrencySymbol = currencySymbolSchema.safeParse(
      getStringField(formData, "currencySymbol"),
    );

    if (!parsedCurrencySymbol.success) {
      throw new Error("Invalid currency symbol.");
    }

    return parsedCurrencySymbol.data;
  }

  if (key === "admin.limits") {
    return {
      Lite: {
        conversationsPerDay: getNumericField(
          formData,
          "liteConversationsPerDay",
        ),
        promptsPerConversation: getNumericField(
          formData,
          "litePromptsPerConversation",
        ),
        images: getNumericField(formData, "liteImages"),
        audio: getNumericField(formData, "liteAudio"),
        video: getNumericField(formData, "liteVideo"),
      },
      Pro: {
        conversationsPerDay: getNumericField(
          formData,
          "proConversationsPerDay",
        ),
        promptsPerConversation: getNumericField(
          formData,
          "proPromptsPerConversation",
        ),
        images: getNumericField(formData, "proImages"),
        audio: getNumericField(formData, "proAudio"),
        video: getNumericField(formData, "proVideo"),
      },
      Premium: {
        conversationsPerDay: getNumericField(
          formData,
          "premiumConversationsPerDay",
        ),
        promptsPerConversation: getNumericField(
          formData,
          "premiumPromptsPerConversation",
        ),
        images: getNumericField(formData, "premiumImages"),
        audio: getNumericField(formData, "premiumAudio"),
        video: getNumericField(formData, "premiumVideo"),
      },
    };
  }

  if (key === "admin.trialLimits") {
    return {
      promptsPerConversation: getNumericField(formData, "trialPrompts"),
      images: getNumericField(formData, "trialImages"),
      audio: getNumericField(formData, "trialAudio"),
      video: getNumericField(formData, "trialVideo"),
    };
  }

  if (key === "admin.theme") {
    const defaultMode = getStringField(formData, "defaultMode");

    if (defaultMode !== "light" && defaultMode !== "dark") {
      throw new Error("Invalid default theme mode.");
    }

    return { defaultMode };
  }

  if (PERSONA_ACCESS_KEYS.has(key)) {
    return formData
      .getAll("personaIds")
      .filter(
        (value): value is PersonaId =>
          typeof value === "string" &&
          VALID_PERSONA_ID_SET.has(value as PersonaId),
      );
  }

  return null;
}

export async function toggleUserSuspensionAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const targetUserId = getStringField(formData, "userId");
  const suspended = getStringField(formData, "suspended") === "true";

  await connectToDatabase();

  const updatedUser = await User.findByIdAndUpdate(
    targetUserId,
    {
      $set: {
        suspended,
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: false,
    },
  );

  if (!updatedUser) {
    throw new Error("User not found.");
  }

  await createAdminAuditLogEntry({
    adminId,
    action: suspended ? "user.suspend" : "user.reinstate",
    targetType: "User",
    targetId: targetUserId,
    details: {
      clerkId: updatedUser.clerkId,
      suspended,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function removeUserByAdminAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const targetUserId = getStringField(formData, "userId");

  await connectToDatabase();

  const targetUser = await User.findById(targetUserId)
    .select("clerkId email username")
    .lean();

  if (!targetUser) {
    throw new Error("User not found.");
  }

  const client = await clerkClient();
  await client.users.deleteUser(targetUser.clerkId);

  const [deletedTasks, deletedTransactions, deletedUser] = await Promise.all([
    Task.deleteMany({ userId: targetUser.clerkId }),
    Transaction.deleteMany({ clerkId: targetUser.clerkId }),
    User.findByIdAndDelete(targetUserId),
  ]);

  let deletedObjectsCount = 0;
  let assetCleanupStatus = "completed";

  try {
    deletedObjectsCount = await deleteS3Prefix(`${targetUser.clerkId}/`);
  } catch {
    assetCleanupStatus = "failed";
  }

  await createAdminAuditLogEntry({
    adminId,
    action: "user.remove",
    targetType: "User",
    targetId: targetUserId,
    details: {
      clerkId: targetUser.clerkId,
      email: targetUser.email,
      username: targetUser.username,
      deletedTasks: deletedTasks.deletedCount ?? 0,
      deletedTransactions: deletedTransactions.deletedCount ?? 0,
      deletedObjectsCount,
      assetCleanupStatus,
      deletedUser: Boolean(deletedUser),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function updateAdminSettingAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const key = getStringField(formData, "key");
  const categoryValue = getStringField(formData, "category");
  const parsedCategory = adminSettingCategorySchema.safeParse(categoryValue);

  if (!parsedCategory.success) {
    throw new Error("Invalid settings category.");
  }

  const category = parsedCategory.data;
  const rawValue = formData.get("value");
  const parsedValue =
    typeof rawValue === "string" && rawValue.trim().length > 0
      ? parseJsonValue(rawValue.trim())
      : parseStructuredAdminSettingValue({ key, formData });

  if (parsedValue === null) {
    throw new Error("Missing required field: value");
  }

  await connectToDatabase();

  await AppSetting.findOneAndUpdate(
    { key },
    {
      $set: {
        value: parsedValue,
        category,
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: true,
    },
  );

  await createAdminAuditLogEntry({
    adminId,
    action: "setting.update",
    targetType: "AppSetting",
    targetId: key,
    details: {
      category,
      value: parsedValue,
    },
  });

  revalidatePath("/admin/settings");

  if (
    key === "admin.pricing" ||
    key === "admin.currencySymbol" ||
    key === "admin.limits" ||
    key === "admin.trialLimits"
  ) {
    revalidatePath("/plans");
    revalidatePath("/app/plans");
  }

  if (PERSONA_ACCESS_KEYS.has(key)) {
    revalidatePath("/app");
    revalidatePath("/app/new");
    revalidatePath("/app/personas");
  }
}

export async function createPublicPageAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const title = getStringField(formData, "title");
  const slug = getStringField(formData, "slug");

  await connectToDatabase();

  const existingPage = await PublicPage.findOne({ slug }).select("_id").lean();

  if (existingPage) {
    throw new Error("A page with this slug already exists.");
  }

  const latestPage = await PublicPage.findOne({})
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  const page = await PublicPage.create({
    slug,
    title,
    content: "<p>Start writing...</p>",
    sortOrder: (latestPage?.sortOrder ?? -1) + 1,
    isPublished: false,
    updatedBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await createAdminAuditLogEntry({
    adminId,
    action: "page.create",
    targetType: "PublicPage",
    targetId: String(page._id),
    details: {
      slug,
      title,
    },
  });

  revalidatePath("/admin/website");
}

export async function togglePublicPagePublishedAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const pageId = getStringField(formData, "pageId");
  const isPublished = getStringField(formData, "isPublished") === "true";

  await connectToDatabase();

  const page = await PublicPage.findByIdAndUpdate(
    pageId,
    {
      $set: {
        isPublished,
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: false,
    },
  );

  if (!page) {
    throw new Error("Page not found.");
  }

  await createAdminAuditLogEntry({
    adminId,
    action: isPublished ? "page.publish" : "page.unpublish",
    targetType: "PublicPage",
    targetId: pageId,
    details: {
      slug: page.slug,
      isPublished,
    },
  });

  revalidatePath("/admin/website");
  revalidatePath(`/admin/website/${pageId}`);
}

export async function deletePublicPageAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const pageId = getStringField(formData, "pageId");

  await connectToDatabase();

  const deletedPage = await PublicPage.findByIdAndDelete(pageId);

  if (!deletedPage) {
    throw new Error("Page not found.");
  }

  await createAdminAuditLogEntry({
    adminId,
    action: "page.delete",
    targetType: "PublicPage",
    targetId: pageId,
    details: {
      slug: deletedPage.slug,
      title: deletedPage.title,
    },
  });

  revalidatePath("/admin/website");
}

export async function updatePublicPageSortOrderAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const pageId = getStringField(formData, "pageId");
  const sortOrder = Number(getStringField(formData, "sortOrder"));

  await connectToDatabase();

  const page = await PublicPage.findByIdAndUpdate(
    pageId,
    {
      $set: {
        sortOrder,
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: false,
    },
  );

  if (!page) {
    throw new Error("Page not found.");
  }

  await createAdminAuditLogEntry({
    adminId,
    action: "page.sort",
    targetType: "PublicPage",
    targetId: pageId,
    details: {
      slug: page.slug,
      sortOrder,
    },
  });

  revalidatePath("/admin/website");
  revalidatePath(`/admin/website/${pageId}`);
}

export async function savePublicPageAction(formData: FormData) {
  const adminId = await requireAdminActionAccess();
  const pageId = getStringField(formData, "pageId");
  const title = getStringField(formData, "title");
  const content = getStringField(formData, "content");

  await connectToDatabase();

  const page = await PublicPage.findByIdAndUpdate(
    pageId,
    {
      $set: {
        title,
        content,
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: false,
    },
  );

  if (!page) {
    throw new Error("Page not found.");
  }

  await createAdminAuditLogEntry({
    adminId,
    action: "page.save",
    targetType: "PublicPage",
    targetId: pageId,
    details: {
      slug: page.slug,
      title,
    },
  });

  revalidatePath("/admin/website");
  revalidatePath(`/admin/website/${pageId}`);
}
