"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";

function getStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return value.trim();
}

function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
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
  const category = getStringField(formData, "category");
  const rawValue = getStringField(formData, "value");
  const parsedValue = parseJsonValue(rawValue);

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
