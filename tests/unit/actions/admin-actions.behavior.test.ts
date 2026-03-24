import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  bulkDeletePublicPagesAction,
  bulkDeleteTransactionsAction,
  bulkPublishPublicPagesAction,
  bulkRemoveUsersAction,
  bulkSuspendUsersAction,
  bulkUnpublishPublicPagesAction,
  createPublicPageAction,
  deletePublicPageAction,
  removeUserByAdminAction,
  savePublicPageAction,
  togglePublicPagePublishedAction,
  toggleUserSuspensionAction,
  updateAdminSettingAction,
  updatePublicPageSortOrderAction,
} from "@/lib/actions/admin.actions";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import User from "@/lib/database/models/user.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/public-page.model", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/usage-event.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findByIdAndUpdate: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/utils/admin-audit", () => ({
  createAdminAuditLogEntry: vi.fn(),
}));

vi.mock("@/lib/utils/admin-auth", () => ({
  requireAdminActionAccess: vi.fn(),
}));

vi.mock("@/lib/utils/aws/delete-s3-prefix", () => ({
  default: vi.fn(),
}));

function buildFormData(
  fields: Record<string, string | string[] | undefined>,
): FormData {
  const formData = new FormData();

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(field, entry);
      }
      continue;
    }

    formData.set(field, value);
  }

  return formData;
}

function buildFindByIdSelectLean<T>(value: T) {
  const lean = vi.fn().mockResolvedValue(value as never);
  const select = vi.fn().mockReturnValue({ lean });
  return { select } as never;
}

describe("admin.actions behavior coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminActionAccess).mockResolvedValue("admin_clerk_1");
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(createAdminAuditLogEntry).mockResolvedValue(undefined as never);
    vi.mocked(AppSetting.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 0 } as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
    vi.mocked(PublicPage.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
    vi.mocked(PublicPage.updateMany).mockResolvedValue({
      modifiedCount: 0,
    } as never);
    vi.mocked(deleteS3Prefix).mockResolvedValue(0);
    vi.mocked(Task.deleteMany).mockResolvedValue({ deletedCount: 0 } as never);
    vi.mocked(UsageEvent.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue({
      _id: "deleted",
    } as never);
  });

  describe("updateAdminSettingAction", () => {
    it("parses model settings payload from structured fields", async () => {
      const result = await updateAdminSettingAction(
        buildFormData({
          key: "admin.models",
          category: "models",
          liteChatModel: "gpt-4.1-mini",
          proChatModel: "gpt-4.1",
          premiumChatModel: "gpt-5.4",
          imageModel: "gpt-image-1.5",
          audioModel: "gpt-audio-mini",
          videoModel: "sora-2",
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "Settings updated.",
        severity: "success",
      });
      expect(AppSetting.findOneAndUpdate).toHaveBeenCalledWith(
        { key: "admin.models" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "models",
            updatedBy: "admin_clerk_1",
            value: {
              liteChatModel: "gpt-4.1-mini",
              proChatModel: "gpt-4.1",
              premiumChatModel: "gpt-5.4",
              imageModel: "gpt-image-1.5",
              audioModel: "gpt-audio-mini",
              videoModel: "sora-2",
            },
          }),
        }),
        expect.objectContaining({
          strict: true,
          upsert: true,
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/settings");
    });

    it("parses pricing settings and revalidates plan pages", async () => {
      await updateAdminSettingAction(
        buildFormData({
          key: "admin.pricing",
          category: "plans",
          proPrice: "19",
          premiumPrice: "39",
        }),
      );

      expect(AppSetting.findOneAndUpdate).toHaveBeenCalledWith(
        { key: "admin.pricing" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "plans",
            value: {
              proPrice: 19,
              premiumPrice: 39,
            },
          }),
        }),
        expect.any(Object),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/plans");
      expect(revalidatePath).toHaveBeenCalledWith("/app/plans");
    });

    it("filters persona access list and revalidates app persona routes", async () => {
      await updateAdminSettingAction(
        buildFormData({
          key: "persona_access_lite",
          category: "features",
          personaIds: ["strategist", "developer", "invalid-persona-id"],
        }),
      );

      expect(AppSetting.findOneAndUpdate).toHaveBeenCalledWith(
        { key: "persona_access_lite" },
        expect.objectContaining({
          $set: expect.objectContaining({
            value: ["strategist", "developer"],
          }),
        }),
        expect.any(Object),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/app");
      expect(revalidatePath).toHaveBeenCalledWith("/app/new");
      expect(revalidatePath).toHaveBeenCalledWith("/app/personas");
    });

    it("normalizes support email and revalidates support-dependent routes", async () => {
      await updateAdminSettingAction(
        buildFormData({
          key: "admin.supportEmail",
          category: "features",
          supportEmail: "SUPPORT@Droplet.Example",
        }),
      );

      expect(AppSetting.findOneAndUpdate).toHaveBeenCalledWith(
        { key: "admin.supportEmail" },
        expect.objectContaining({
          $set: expect.objectContaining({
            value: "support@droplet.example",
          }),
        }),
        expect.any(Object),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/privacy");
      expect(revalidatePath).toHaveBeenCalledWith("/cookies");
      expect(revalidatePath).toHaveBeenCalledWith("/app/profile");
    });

    it("returns category validation error for unsupported categories", async () => {
      const result = await updateAdminSettingAction(
        buildFormData({
          key: "admin.models",
          category: "unsupported",
          value: "{}",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Invalid settings category.",
        severity: "error",
      });
      expect(AppSetting.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("returns missing-value error when key has no JSON or structured parser", async () => {
      const result = await updateAdminSettingAction(
        buildFormData({
          key: "unknown.config",
          category: "features",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Missing required settings value.",
        severity: "error",
      });
      expect(AppSetting.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("returns generic error when currency symbol is invalid", async () => {
      const result = await updateAdminSettingAction(
        buildFormData({
          key: "admin.currencySymbol",
          category: "plans",
          currencySymbol: "£",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Unable to update settings.",
        severity: "error",
      });
      expect(AppSetting.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("returns generic error when theme mode is invalid", async () => {
      const result = await updateAdminSettingAction(
        buildFormData({
          key: "admin.theme",
          category: "theme",
          defaultMode: "sepia",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Unable to update settings.",
        severity: "error",
      });
      expect(AppSetting.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe("public page action error paths", () => {
    it("returns duplicate slug error in createPublicPageAction", async () => {
      const existingPageQuery = buildFindByIdSelectLean({ _id: "page_1" });
      vi.mocked(PublicPage.findOne).mockReturnValue(existingPageQuery as never);

      const result = await createPublicPageAction(
        buildFormData({
          title: "Pricing",
          slug: "plans",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "A page with this slug already exists.",
        severity: "error",
      });
      expect(PublicPage.create).not.toHaveBeenCalled();
    });

    it("returns not found when toggling publish for a missing page", async () => {
      vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue(null);

      const result = await togglePublicPagePublishedAction(
        buildFormData({
          pageId: "507f1f77bcf86cd799439111",
          isPublished: "true",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Page not found.",
        severity: "error",
      });
    });

    it("returns not found when deleting a missing page", async () => {
      vi.mocked(PublicPage.findByIdAndDelete).mockResolvedValue(null);

      const result = await deletePublicPageAction(
        buildFormData({
          pageId: "507f1f77bcf86cd799439112",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Page not found.",
        severity: "error",
      });
    });

    it("returns not found when updating sort order on a missing page", async () => {
      vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue(null);

      const result = await updatePublicPageSortOrderAction(
        buildFormData({
          pageId: "507f1f77bcf86cd799439113",
          sortOrder: "5",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Page not found.",
        severity: "error",
      });
    });

    it("returns not found when saving a missing page", async () => {
      vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue(null);

      const result = await savePublicPageAction(
        buildFormData({
          pageId: "507f1f77bcf86cd799439114",
          title: "Terms",
          content: "<p>Updated content</p>",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Page not found.",
        severity: "error",
      });
    });
  });

  describe("bulk admin actions", () => {
    it("suspends selected users and logs audit details", async () => {
      vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 2 } as never);

      const result = await bulkSuspendUsersAction(
        buildFormData({
          userIds: ["507f1f77bcf86cd799439201", "507f1f77bcf86cd799439202"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "2 users suspended.",
        severity: "warning",
      });
      expect(User.updateMany).toHaveBeenCalledWith(
        {
          _id: {
            $in: ["507f1f77bcf86cd799439201", "507f1f77bcf86cd799439202"],
          },
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            suspended: true,
          }),
        }),
        expect.objectContaining({
          strict: true,
          upsert: false,
        }),
      );
      expect(createAdminAuditLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.bulk_suspend",
          targetType: "User",
        }),
      );
    });

    it("returns error when bulk suspend is called without user ids", async () => {
      const result = await bulkSuspendUsersAction(new FormData());

      expect(result).toEqual({
        status: "error",
        message: "Unable to suspend selected users.",
        severity: "error",
      });
      expect(User.updateMany).not.toHaveBeenCalled();
    });

    it("deletes selected transactions and returns warning state", async () => {
      vi.mocked(Transaction.deleteMany).mockResolvedValue({
        deletedCount: 3,
      } as never);

      const result = await bulkDeleteTransactionsAction(
        buildFormData({
          transactionIds: ["txn_1", "txn_2", "txn_3"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "3 transactions removed.",
        severity: "warning",
      });
      expect(Transaction.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["txn_1", "txn_2", "txn_3"] },
      });
    });

    it("deletes selected pages in bulk", async () => {
      vi.mocked(PublicPage.deleteMany).mockResolvedValue({
        deletedCount: 2,
      } as never);

      const result = await bulkDeletePublicPagesAction(
        buildFormData({
          pageIds: ["page_1", "page_2"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "2 pages deleted.",
        severity: "warning",
      });
      expect(PublicPage.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["page_1", "page_2"] },
      });
    });

    it("publishes selected pages in bulk", async () => {
      vi.mocked(PublicPage.updateMany).mockResolvedValue({
        modifiedCount: 4,
      } as never);

      const result = await bulkPublishPublicPagesAction(
        buildFormData({
          pageIds: ["page_1", "page_2", "page_3", "page_4"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "4 pages published.",
        severity: "success",
      });
      expect(PublicPage.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["page_1", "page_2", "page_3", "page_4"] } },
        expect.objectContaining({
          $set: expect.objectContaining({
            isPublished: true,
            updatedBy: "admin_clerk_1",
          }),
        }),
        expect.objectContaining({
          strict: true,
          upsert: false,
        }),
      );
    });

    it("unpublishes selected pages in bulk", async () => {
      vi.mocked(PublicPage.updateMany).mockResolvedValue({
        modifiedCount: 1,
      } as never);

      const result = await bulkUnpublishPublicPagesAction(
        buildFormData({
          pageIds: ["page_1"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "1 pages unpublished.",
        severity: "success",
      });
      expect(PublicPage.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["page_1"] } },
        expect.objectContaining({
          $set: expect.objectContaining({
            isPublished: false,
            updatedBy: "admin_clerk_1",
          }),
        }),
        expect.objectContaining({
          strict: true,
          upsert: false,
        }),
      );
    });
  });

  describe("user removal actions", () => {
    it("removes multiple users via bulkRemoveUsersAction", async () => {
      const deleteUser = vi.fn().mockResolvedValue(undefined);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          deleteUser,
        },
      } as never);

      const userLookup = new Map<
        string,
        { clerkId: string; email: string; username: string }
      >([
        [
          "507f1f77bcf86cd799439301",
          {
            clerkId: "clerk_u1",
            email: "user1@example.com",
            username: "user_1",
          },
        ],
        [
          "507f1f77bcf86cd799439302",
          {
            clerkId: "clerk_u2",
            email: "user2@example.com",
            username: "user_2",
          },
        ],
      ]);

      vi.mocked(User.findById).mockImplementation((userId: unknown) => {
        const value = userLookup.get(String(userId)) ?? null;
        return buildFindByIdSelectLean(value) as never;
      });

      vi.mocked(Task.deleteMany).mockResolvedValue({ deletedCount: 2 } as never);
      vi.mocked(Transaction.deleteMany).mockResolvedValue({
        deletedCount: 1,
      } as never);
      vi.mocked(UsageEvent.deleteMany).mockResolvedValue({
        deletedCount: 3,
      } as never);
      vi.mocked(deleteS3Prefix).mockResolvedValue(5);

      const result = await bulkRemoveUsersAction(
        buildFormData({
          userIds: ["507f1f77bcf86cd799439301", "507f1f77bcf86cd799439302"],
        }),
      );

      expect(result).toEqual({
        status: "success",
        message: "2 users removed.",
        severity: "warning",
      });
      expect(deleteUser).toHaveBeenCalledTimes(2);
      expect(User.findByIdAndDelete).toHaveBeenCalledTimes(2);
      expect(createAdminAuditLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.remove",
          targetType: "User",
        }),
      );
    });

    it("returns error when removeUserByAdminAction cannot find user", async () => {
      vi.mocked(User.findById).mockReturnValue(buildFindByIdSelectLean(null));

      const result = await removeUserByAdminAction(
        buildFormData({
          userId: "507f1f77bcf86cd799439303",
        }),
      );

      expect(result).toEqual({
        status: "error",
        message: "Unable to remove user.",
        severity: "error",
      });
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("returns error when toggleUserSuspensionAction receives invalid input", async () => {
      const result = await toggleUserSuspensionAction(new FormData());

      expect(result).toEqual({
        status: "error",
        message: "Unable to update user state.",
        severity: "error",
      });
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
