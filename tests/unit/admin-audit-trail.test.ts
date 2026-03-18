import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
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

type AdminAuditPayload = {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
};

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findByIdAndUpdate: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
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

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [field, value] of Object.entries(fields)) {
    formData.set(field, value);
  }

  return formData;
}

function getAuditPayload(): AdminAuditPayload {
  expect(createAdminAuditLogEntry).toHaveBeenCalledTimes(1);

  const payload = vi.mocked(createAdminAuditLogEntry).mock.calls[0]?.[0] as
    | AdminAuditPayload
    | undefined;

  expect(payload).toBeDefined();
  expect(payload).toMatchObject({
    adminId: expect.any(String),
    action: expect.any(String),
    targetType: expect.any(String),
    targetId: expect.any(String),
  });

  return payload as AdminAuditPayload;
}

describe("admin actions audit trail completeness", () => {
  const adminId = "admin_clerk_1";
  const targetUserId = "507f1f77bcf86cd799439011";
  const pageId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminActionAccess).mockResolvedValue(adminId);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(createAdminAuditLogEntry).mockResolvedValue(undefined as never);
    vi.mocked(deleteS3Prefix).mockResolvedValue(4);
    vi.mocked(UsageEvent.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
  });

  it("logs audit entry for toggleUserSuspensionAction", async () => {
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue({
      clerkId: "client_clerk_1",
    } as never);

    await toggleUserSuspensionAction(
      buildFormData({
        userId: targetUserId,
        suspended: "true",
      }),
    );

    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "user.suspend",
      targetType: "User",
      targetId: targetUserId,
    });
  });

  it("logs audit entry for removeUserByAdminAction", async () => {
    const deleteUserMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        deleteUser: deleteUserMock,
      },
    } as never);

    const leanMock = vi.fn().mockResolvedValue({
      clerkId: "client_clerk_1",
      email: "client@example.com",
      username: "client_user",
    });
    const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
    vi.mocked(User.findById).mockReturnValue({ select: selectMock } as never);

    vi.mocked(Task.deleteMany).mockResolvedValue({ deletedCount: 2 } as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 1,
    } as never);
    vi.mocked(UsageEvent.deleteMany).mockResolvedValue({
      deletedCount: 3,
    } as never);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue({
      _id: targetUserId,
    } as never);

    await removeUserByAdminAction(
      buildFormData({
        userId: targetUserId,
      }),
    );

    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(deleteUserMock).toHaveBeenCalledWith("client_clerk_1");
    expect(UsageEvent.deleteMany).toHaveBeenCalledWith({
      userId: "client_clerk_1",
    });
    expect(User.findByIdAndDelete).toHaveBeenCalledWith(targetUserId);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "user.remove",
      targetType: "User",
      targetId: targetUserId,
    });
  });

  it("logs audit entry for updateAdminSettingAction", async () => {
    vi.mocked(AppSetting.findOneAndUpdate).mockResolvedValue({
      key: "limits.chat",
    } as never);

    await updateAdminSettingAction(
      buildFormData({
        key: "limits.chat",
        category: "limits",
        value: '{"daily":5}',
      }),
    );

    expect(AppSetting.findOneAndUpdate).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "setting.update",
      targetType: "AppSetting",
      targetId: "limits.chat",
    });
  });

  it("logs audit entry for createPublicPageAction", async () => {
    const existingPageLeanMock = vi.fn().mockResolvedValue(null);
    const existingPageSelectMock = vi
      .fn()
      .mockReturnValue({ lean: existingPageLeanMock });

    const latestPageLeanMock = vi.fn().mockResolvedValue({ sortOrder: 5 });
    const latestPageSelectMock = vi
      .fn()
      .mockReturnValue({ lean: latestPageLeanMock });
    const latestPageSortMock = vi
      .fn()
      .mockReturnValue({ select: latestPageSelectMock });

    vi.mocked(PublicPage.findOne)
      .mockReturnValueOnce({ select: existingPageSelectMock } as never)
      .mockReturnValueOnce({ sort: latestPageSortMock } as never);

    vi.mocked(PublicPage.create).mockResolvedValue({
      _id: pageId,
    } as never);

    await createPublicPageAction(
      buildFormData({
        title: "About Droplet",
        slug: "about-droplet",
      }),
    );

    expect(PublicPage.create).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "page.create",
      targetType: "PublicPage",
      targetId: pageId,
    });
  });

  it("logs audit entry for togglePublicPagePublishedAction", async () => {
    vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue({
      slug: "about-droplet",
    } as never);

    await togglePublicPagePublishedAction(
      buildFormData({
        pageId,
        isPublished: "true",
      }),
    );

    expect(PublicPage.findByIdAndUpdate).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "page.publish",
      targetType: "PublicPage",
      targetId: pageId,
    });
  });

  it("logs audit entry for deletePublicPageAction", async () => {
    vi.mocked(PublicPage.findByIdAndDelete).mockResolvedValue({
      slug: "about-droplet",
      title: "About Droplet",
    } as never);

    await deletePublicPageAction(
      buildFormData({
        pageId,
      }),
    );

    expect(PublicPage.findByIdAndDelete).toHaveBeenCalledWith(pageId);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "page.delete",
      targetType: "PublicPage",
      targetId: pageId,
    });
  });

  it("logs audit entry for updatePublicPageSortOrderAction", async () => {
    vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue({
      slug: "about-droplet",
    } as never);

    await updatePublicPageSortOrderAction(
      buildFormData({
        pageId,
        sortOrder: "7",
      }),
    );

    expect(PublicPage.findByIdAndUpdate).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "page.sort",
      targetType: "PublicPage",
      targetId: pageId,
    });
  });

  it("logs audit entry for savePublicPageAction", async () => {
    vi.mocked(PublicPage.findByIdAndUpdate).mockResolvedValue({
      slug: "about-droplet",
    } as never);

    await savePublicPageAction(
      buildFormData({
        pageId,
        title: "About Droplet",
        content: "<p>Updated content</p>",
      }),
    );

    expect(PublicPage.findByIdAndUpdate).toHaveBeenCalledTimes(1);

    const payload = getAuditPayload();
    expect(payload).toMatchObject({
      adminId,
      action: "page.save",
      targetType: "PublicPage",
      targetId: pageId,
    });
  });

  it("revalidates admin routes after each mutation", async () => {
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue({
      clerkId: "client_clerk_1",
    } as never);

    await toggleUserSuspensionAction(
      buildFormData({
        userId: targetUserId,
        suspended: "false",
      }),
    );

    expect(revalidatePath).toHaveBeenCalled();
  });
});
