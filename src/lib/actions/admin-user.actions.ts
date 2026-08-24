"use server";

import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";
import type { AdminActionState } from "@/components/admin/admin-action-state";
import {
  bulkRemoveUsersActionSchema,
  type BulkRemoveUsersActionInput,
  bulkSuspendUsersActionSchema,
  type BulkSuspendUsersActionInput,
  errorState,
  logAdminActionError,
  pluralize,
  removeUserByAdminActionSchema,
  type RemoveUserByAdminActionInput,
  resolveActionFormData,
  successState,
  toggleUserSuspensionActionSchema,
  type ToggleUserSuspensionActionInput,
  withSummaryDetails,
} from "@/lib/actions/admin-action-helpers";

async function removeUserByAdmin({
  adminId,
  targetUserId,
}: {
  adminId: string;
  targetUserId: string;
}): Promise<{
  userId: string;
  clerkId: string;
  deletedTasks: number;
  deletedTransactions: number;
  deletedUsageEvents: number;
  deletedRateLimitEntries: number;
  deletedUploads: number;
  deletedObjectsCount: number;
  assetCleanupStatus: "completed";
}> {
  const targetUser = await User.findById(targetUserId)
    .select("clerkId email username role")
    .lean();

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.role === "admin") {
    throw new Error("Cannot remove an admin user.");
  }

  const client = await clerkClient();
  await client.users.deleteUser(targetUser.clerkId);

  const cascadeResult = await deleteUserCascade(targetUser.clerkId);
  const deletedUser = await User.findByIdAndDelete(targetUserId);

  if (!deletedUser) {
    throw new Error("User deletion failed.");
  }

  const assetCleanupStatus = "completed" as const;

  await createAdminAuditLogEntry({
    adminId,
    action: "user.remove",
    targetType: "User",
    targetId: targetUserId,
    details: {
      clerkId: targetUser.clerkId,
      email: targetUser.email,
      username: targetUser.username,
      deletedTasks: cascadeResult.deletedTasks ?? 0,
      deletedTransactions: cascadeResult.deletedTransactions ?? 0,
      deletedUsageEvents: cascadeResult.deletedUsageEvents ?? 0,
      deletedRateLimitEntries: cascadeResult.deletedRateLimitEntries ?? 0,
      deletedUploads: cascadeResult.deletedUploads ?? 0,
      deletedObjectsCount: cascadeResult.deletedObjectsCount ?? 0,
      assetCleanupStatus,
      deletedUser: Boolean(deletedUser),
    },
  });

  return {
    userId: targetUserId,
    clerkId: targetUser.clerkId,
    deletedTasks: cascadeResult.deletedTasks ?? 0,
    deletedTransactions: cascadeResult.deletedTransactions ?? 0,
    deletedUsageEvents: cascadeResult.deletedUsageEvents ?? 0,
    deletedRateLimitEntries: cascadeResult.deletedRateLimitEntries ?? 0,
    deletedUploads: cascadeResult.deletedUploads ?? 0,
    deletedObjectsCount: cascadeResult.deletedObjectsCount ?? 0,
    assetCleanupStatus,
  };
}

export async function toggleUserSuspensionAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = toggleUserSuspensionActionSchema.safeParse({
      userId: formData.get("userId"),
      suspended: formData.get("suspended"),
    });

    if (!parsedInput.success) {
      return errorState("User selection and suspension state are required.");
    }

    const { userId: targetUserId, suspended }: ToggleUserSuspensionActionInput =
      parsedInput.data;

    await connectToDatabase();

    const targetUser = (await User.findById(targetUserId)
      .select("role")
      .lean()) as { role?: string } | null;

    if (!targetUser) {
      return errorState("User not found.");
    }

    if (targetUser.role === "admin") {
      return errorState("Admin accounts cannot be suspended.");
    }

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
      return errorState("User not found.");
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

    return successState(suspended ? "User suspended." : "User reinstated.");
  } catch (error) {
    logAdminActionError("toggleUserSuspensionAction", error);
    return errorState("Unable to update user state.");
  }
}

export async function removeUserByAdminAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = removeUserByAdminActionSchema.safeParse({
      userId: formData.get("userId"),
    });

    if (!parsedInput.success) {
      return errorState("User selection is required.");
    }

    const { userId: targetUserId }: RemoveUserByAdminActionInput =
      parsedInput.data;

    await connectToDatabase();
    await removeUserByAdmin({ adminId, targetUserId });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return successState("User and related data removed.");
  } catch (error) {
    logAdminActionError("removeUserByAdminAction", error);
    return errorState("Unable to remove user.");
  }
}

export async function bulkSuspendUsersAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkSuspendUsersActionSchema.safeParse({
      userIds: formData
        .getAll("userIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to suspend selected users.");
    }

    const { userIds }: BulkSuspendUsersActionInput = parsedInput.data;

    await connectToDatabase();

    const selectedUsers = (await User.find({
      _id: { $in: userIds },
    })
      .select("_id role")
      .lean()) as Array<{ _id: unknown; role?: string }>;
    const selectedUserMap = new Map(
      selectedUsers.map((selectedUser) => [
        String(selectedUser._id),
        selectedUser.role ?? "client",
      ]),
    );
    const adminUserIdSet = new Set<string>();
    const missingUserIds: string[] = [];
    const suspendableUserIds: string[] = [];

    for (const userId of userIds) {
      const userRole = selectedUserMap.get(userId);

      if (!userRole) {
        missingUserIds.push(userId);
        continue;
      }

      if (userRole === "admin") {
        adminUserIdSet.add(userId);
        continue;
      }

      suspendableUserIds.push(userId);
    }

    if (adminUserIdSet.size > 0) {
      process.stderr.write(
        `[admin.actions] bulkSuspendUsersAction skipped admin users: ${Array.from(adminUserIdSet).join(",")}\n`,
      );
    }

    if (missingUserIds.length > 0) {
      process.stderr.write(
        `[admin.actions] bulkSuspendUsersAction missing users: ${missingUserIds.join(",")}\n`,
      );
    }

    let modifiedCount = 0;
    let matchedCount = 0;

    if (suspendableUserIds.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: suspendableUserIds } },
        {
          $set: {
            suspended: true,
            updatedAt: new Date(),
          },
        },
        {
          strict: true,
          upsert: false,
        },
      );

      modifiedCount = result.modifiedCount ?? 0;
      matchedCount = result.matchedCount ?? suspendableUserIds.length;
    }

    const alreadySuspendedCount = Math.max(matchedCount - modifiedCount, 0);
    const message = withSummaryDetails(`${modifiedCount} users suspended.`, [
      adminUserIdSet.size > 0
        ? `${adminUserIdSet.size} admin ${pluralize(adminUserIdSet.size, "user")} skipped.`
        : "",
      missingUserIds.length > 0
        ? `${missingUserIds.length} ${pluralize(missingUserIds.length, "user")} not found.`
        : "",
      alreadySuspendedCount > 0
        ? `${alreadySuspendedCount} ${pluralize(alreadySuspendedCount, "user")} already suspended.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "user.bulk_suspend",
      targetType: "User",
      targetId: userIds.join(","),
      details: {
        selectedCount: userIds.length,
        modifiedCount,
        matchedCount,
        alreadySuspendedCount,
        skippedAdminCount: adminUserIdSet.size,
        skippedAdminUserIds: Array.from(adminUserIdSet),
        missingCount: missingUserIds.length,
        missingUserIds,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return successState(message, "warning");
  } catch (error) {
    logAdminActionError("bulkSuspendUsersAction", error);
    return errorState("Unable to suspend selected users.");
  }
}

export async function bulkRemoveUsersAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkRemoveUsersActionSchema.safeParse({
      userIds: formData
        .getAll("userIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to remove selected users.");
    }

    const { userIds }: BulkRemoveUsersActionInput = parsedInput.data;

    await connectToDatabase();

    const selectedUsers = (await User.find({
      _id: { $in: userIds },
    })
      .select("_id role")
      .lean()) as Array<{ _id: unknown; role?: string }>;
    const selectedUserMap = new Map(
      selectedUsers.map((selectedUser) => [
        String(selectedUser._id),
        selectedUser.role ?? "client",
      ]),
    );
    const adminUserIdSet = new Set<string>();
    const missingUserIds: string[] = [];
    const removableUserIds: string[] = [];

    for (const userId of userIds) {
      const userRole = selectedUserMap.get(userId);

      if (!userRole) {
        missingUserIds.push(userId);
        continue;
      }

      if (userRole === "admin") {
        adminUserIdSet.add(userId);
        continue;
      }

      removableUserIds.push(userId);
    }

    if (adminUserIdSet.size > 0) {
      process.stderr.write(
        `[admin.actions] bulkRemoveUsersAction skipped admin users: ${Array.from(adminUserIdSet).join(",")}\n`,
      );
    }

    if (missingUserIds.length > 0) {
      process.stderr.write(
        `[admin.actions] bulkRemoveUsersAction missing users: ${missingUserIds.join(",")}\n`,
      );
    }

    let removedCount = 0;
    const failedRemovals: Array<{ userId: string; reason: string }> = [];

    for (const targetUserId of removableUserIds) {
      try {
        await removeUserByAdmin({ adminId, targetUserId });
        removedCount += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        failedRemovals.push({ userId: targetUserId, reason });
        process.stderr.write(
          `[admin.actions] bulkRemoveUsersAction failed user ${targetUserId}: ${reason}\n`,
        );
      }
    }

    const message = withSummaryDetails(`${removedCount} users removed.`, [
      adminUserIdSet.size > 0
        ? `${adminUserIdSet.size} admin ${pluralize(adminUserIdSet.size, "user")} skipped.`
        : "",
      missingUserIds.length > 0
        ? `${missingUserIds.length} ${pluralize(missingUserIds.length, "user")} not found.`
        : "",
      failedRemovals.length > 0
        ? `${failedRemovals.length} ${pluralize(failedRemovals.length, "removal")} failed.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "user.bulk_remove",
      targetType: "User",
      targetId: userIds.join(","),
      details: {
        selectedCount: userIds.length,
        removedCount,
        skippedAdminCount: adminUserIdSet.size,
        skippedAdminUserIds: Array.from(adminUserIdSet),
        missingCount: missingUserIds.length,
        missingUserIds,
        failedCount: failedRemovals.length,
        failedRemovals,
      },
    });

    if (failedRemovals.length > 0) {
      process.stderr.write(
        `[admin.actions] bulkRemoveUsersAction partial failure count: ${failedRemovals.length}\n`,
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return successState(message, "warning");
  } catch (error) {
    logAdminActionError("bulkRemoveUsersAction", error);
    return errorState("Unable to remove selected users.");
  }
}
