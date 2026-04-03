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
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminActionAccessMock,
  connectToDatabaseMock,
  createAdminAuditLogEntryMock,
} = vi.hoisted(() => ({
  requireAdminActionAccessMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
  createAdminAuditLogEntryMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      deleteUser: vi.fn(),
    },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findByIdAndUpdate: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
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

vi.mock("@/lib/utils/admin-audit", () => ({
  createAdminAuditLogEntry: createAdminAuditLogEntryMock,
}));

vi.mock("@/lib/utils/admin-auth", () => ({
  requireAdminActionAccess: requireAdminActionAccessMock,
}));

vi.mock("@/lib/utils/aws/delete-s3-prefix", () => ({
  default: vi.fn(),
}));

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  severity?: "success" | "error" | "warning" | "info";
};

type ProtectedAdminActionCase = {
  name: string;
  run: () => Promise<ActionState>;
  expectedErrorMessage: string;
};

function buildFormData(
  fields: Record<string, string | string[] | undefined>,
): FormData {
  const formData = new FormData();

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(field, item);
      }
      continue;
    }

    formData.set(field, value);
  }

  return formData;
}

function expectErrorState(state: ActionState, message: string): void {
  expect(state).toEqual({
    status: "error",
    message,
    severity: "error",
  });
}

describe("admin.actions auth boundaries", () => {
  const targetUserId = "507f1f77bcf86cd799439011";
  const pageId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const protectedActionCases: ProtectedAdminActionCase[] = [
    {
      name: "toggleUserSuspensionAction",
      run: () =>
        toggleUserSuspensionAction(
          buildFormData({ userId: targetUserId, suspended: "true" }),
        ),
      expectedErrorMessage: "Unable to update user state.",
    },
    {
      name: "removeUserByAdminAction",
      run: () =>
        removeUserByAdminAction(buildFormData({ userId: targetUserId })),
      expectedErrorMessage: "Unable to remove user.",
    },
    {
      name: "updateAdminSettingAction",
      run: () =>
        updateAdminSettingAction(
          buildFormData({
            key: "admin.models",
            category: "models",
            liteChatModel: "gpt-4.1-mini",
            proChatModel: "gpt-4.1",
            premiumChatModel: "gpt-5.4",
            imageModel: "gpt-image-1",
            audioModel: "gpt-audio-mini",
          }),
        ),
      expectedErrorMessage: "Unable to update settings.",
    },
    {
      name: "createPublicPageAction",
      run: () =>
        createPublicPageAction(
          buildFormData({ title: "About", slug: "about" }),
        ),
      expectedErrorMessage: "Unable to create page.",
    },
    {
      name: "togglePublicPagePublishedAction",
      run: () =>
        togglePublicPagePublishedAction(
          buildFormData({ pageId, isPublished: "true" }),
        ),
      expectedErrorMessage: "Unable to change page publish state.",
    },
    {
      name: "deletePublicPageAction",
      run: () => deletePublicPageAction(buildFormData({ pageId })),
      expectedErrorMessage: "Unable to delete page.",
    },
    {
      name: "updatePublicPageSortOrderAction",
      run: () =>
        updatePublicPageSortOrderAction(
          buildFormData({ pageId, sortOrder: "5" }),
        ),
      expectedErrorMessage: "Unable to update sort order.",
    },
    {
      name: "savePublicPageAction",
      run: () =>
        savePublicPageAction(
          buildFormData({ pageId, title: "About", content: "<p>Updated</p>" }),
        ),
      expectedErrorMessage: "Unable to save page content.",
    },
    {
      name: "bulkSuspendUsersAction",
      run: () =>
        bulkSuspendUsersAction(buildFormData({ userIds: [targetUserId] })),
      expectedErrorMessage: "Unable to suspend selected users.",
    },
    {
      name: "bulkRemoveUsersAction",
      run: () =>
        bulkRemoveUsersAction(buildFormData({ userIds: [targetUserId] })),
      expectedErrorMessage: "Unable to remove selected users.",
    },
    {
      name: "bulkDeleteTransactionsAction",
      run: () =>
        bulkDeleteTransactionsAction(
          buildFormData({ transactionIds: ["txn_1"] }),
        ),
      expectedErrorMessage: "Unable to remove selected transactions.",
    },
    {
      name: "bulkDeletePublicPagesAction",
      run: () =>
        bulkDeletePublicPagesAction(buildFormData({ pageIds: [pageId] })),
      expectedErrorMessage: "Unable to delete selected pages.",
    },
    {
      name: "bulkPublishPublicPagesAction",
      run: () =>
        bulkPublishPublicPagesAction(buildFormData({ pageIds: [pageId] })),
      expectedErrorMessage: "Unable to publish selected pages.",
    },
    {
      name: "bulkUnpublishPublicPagesAction",
      run: () =>
        bulkUnpublishPublicPagesAction(buildFormData({ pageIds: [pageId] })),
      expectedErrorMessage: "Unable to unpublish selected pages.",
    },
  ];

  for (const testCase of protectedActionCases) {
    it(`${testCase.name} returns error state when admin auth is unauthorized`, async () => {
      requireAdminActionAccessMock.mockRejectedValueOnce(
        new Error("Unauthorized"),
      );

      const response = await testCase.run();

      expectErrorState(response, testCase.expectedErrorMessage);
      expect(connectToDatabaseMock).not.toHaveBeenCalled();
      expect(createAdminAuditLogEntryMock).not.toHaveBeenCalled();
    });

    it(`${testCase.name} returns error state when admin auth is forbidden`, async () => {
      requireAdminActionAccessMock.mockRejectedValueOnce(
        new Error("Forbidden"),
      );

      const response = await testCase.run();

      expectErrorState(response, testCase.expectedErrorMessage);
      expect(connectToDatabaseMock).not.toHaveBeenCalled();
      expect(createAdminAuditLogEntryMock).not.toHaveBeenCalled();
    });
  }
});
