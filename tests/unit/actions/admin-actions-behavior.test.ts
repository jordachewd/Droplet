import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDefaultAboutContent } from "@/constants/about-data";
import { buildFaqs } from "@/constants/faqs";
import { getDefaultHomepageFeaturedPersonas } from "@/constants/homepage-copy";
import { getDefaultLandingContent } from "@/constants/landing-data";
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
import { createTestUser, mockMongooseModel } from "../test-support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminActionAccessMock,
  connectToDatabaseMock,
  createAdminAuditLogEntryMock,
  deleteUserCascadeMock,
  deleteClerkUserMock,
  userFindByIdAndUpdateMock,
  userFindMock,
  userFindByIdMock,
  userFindByIdAndDeleteMock,
  userUpdateManyMock,
  transactionDeleteManyMock,
  appSettingFindOneAndUpdateMock,
  publicPageFindOneMock,
  publicPageCreateMock,
  publicPageFindByIdAndUpdateMock,
  publicPageFindByIdAndDeleteMock,
  publicPageDeleteManyMock,
  publicPageUpdateManyMock,
} = vi.hoisted(() => ({
  requireAdminActionAccessMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
  createAdminAuditLogEntryMock: vi.fn(),
  deleteUserCascadeMock: vi.fn(),
  deleteClerkUserMock: vi.fn(),
  userFindByIdAndUpdateMock: vi.fn(),
  userFindMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  userFindByIdAndDeleteMock: vi.fn(),
  userUpdateManyMock: vi.fn(),
  transactionDeleteManyMock: vi.fn(),
  appSettingFindOneAndUpdateMock: vi.fn(),
  publicPageFindOneMock: vi.fn(),
  publicPageCreateMock: vi.fn(),
  publicPageFindByIdAndUpdateMock: vi.fn(),
  publicPageFindByIdAndDeleteMock: vi.fn(),
  publicPageDeleteManyMock: vi.fn(),
  publicPageUpdateManyMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      deleteUser: deleteClerkUserMock,
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
    findByIdAndUpdate: userFindByIdAndUpdateMock,
    find: userFindMock,
    findById: userFindByIdMock,
    findByIdAndDelete: userFindByIdAndDeleteMock,
    updateMany: userUpdateManyMock,
  },
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOneAndUpdate: appSettingFindOneAndUpdateMock,
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    deleteMany: transactionDeleteManyMock,
  },
}));

vi.mock("@/lib/database/models/public-page.model", () => ({
  default: {
    findOne: publicPageFindOneMock,
    create: publicPageCreateMock,
    findByIdAndUpdate: publicPageFindByIdAndUpdateMock,
    findByIdAndDelete: publicPageFindByIdAndDeleteMock,
    deleteMany: publicPageDeleteManyMock,
    updateMany: publicPageUpdateManyMock,
  },
}));

vi.mock("@/lib/utils/admin-audit", () => ({
  createAdminAuditLogEntry: createAdminAuditLogEntryMock,
}));

vi.mock("@/lib/utils/admin-auth", () => ({
  requireAdminActionAccess: requireAdminActionAccessMock,
}));

vi.mock("@/lib/utils/delete-user-cascade", () => ({
  deleteUserCascade: deleteUserCascadeMock,
}));

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  severity?: "success" | "error" | "warning" | "info";
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

function expectLatestAudit(action: string, targetType: string): void {
  const calls = createAdminAuditLogEntryMock.mock.calls;
  const latestCall = calls[calls.length - 1]?.[0] as
    | { action: string; targetType: string }
    | undefined;

  expect(latestCall).toBeDefined();
  expect(latestCall).toMatchObject({ action, targetType });
}

function makeExistingPageQuery(result: unknown) {
  return {
    select: vi.fn(() => ({
      lean: vi.fn(async () => result),
    })),
  };
}

function makeLatestPageQuery(result: unknown) {
  return {
    sort: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => result),
      })),
    })),
  };
}

describe("admin.actions behavior", () => {
  const targetUserId = "507f1f77bcf86cd799439011";
  const secondUserId = "507f1f77bcf86cd799439022";
  const pageId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminActionAccessMock.mockResolvedValue("admin_123");
    connectToDatabaseMock.mockResolvedValue(undefined);
    createAdminAuditLogEntryMock.mockResolvedValue(undefined);

    userFindByIdAndUpdateMock.mockResolvedValue({
      _id: targetUserId,
      clerkId: "user_123",
    });
    userUpdateManyMock.mockResolvedValue({ modifiedCount: 2 });
    transactionDeleteManyMock.mockResolvedValue({ deletedCount: 3 });

    deleteUserCascadeMock.mockResolvedValue({
      deletedTasks: 4,
      deletedTransactions: 3,
      deletedUsageEvents: 5,
      deletedRateLimitEntries: 2,
      deletedUploads: 7,
      deletedObjectsCount: 6,
    });
    userFindByIdAndDeleteMock.mockResolvedValue({ _id: targetUserId });
    deleteClerkUserMock.mockResolvedValue(undefined);

    appSettingFindOneAndUpdateMock.mockResolvedValue({ key: "admin.models" });

    publicPageCreateMock.mockResolvedValue({ _id: pageId, slug: "about" });
    publicPageFindByIdAndUpdateMock.mockResolvedValue({
      _id: pageId,
      slug: "about",
      title: "About",
    });
    publicPageFindByIdAndDeleteMock.mockResolvedValue({
      _id: pageId,
      slug: "about",
      title: "About",
    });
    publicPageDeleteManyMock.mockResolvedValue({ deletedCount: 2 });
    publicPageUpdateManyMock.mockResolvedValue({ modifiedCount: 3 });

    userFindByIdMock.mockReturnValue(
      mockMongooseModel({
        clerkId: "user_123",
        email: "user@example.com",
        username: "user",
        role: "client",
      }),
    );
    userFindMock.mockReturnValue(
      mockMongooseModel([
        { _id: targetUserId, role: "client" },
        { _id: secondUserId, role: "client" },
      ]),
    );
  });

  it("toggleUserSuspensionAction updates status and logs audit", async () => {
    const response = await toggleUserSuspensionAction(
      buildFormData({ userId: targetUserId, suspended: "true" }),
    );

    expect(response).toEqual({
      status: "success",
      message: "User suspended.",
      severity: "success",
    });
    expect(userFindByIdAndUpdateMock).toHaveBeenCalledWith(
      targetUserId,
      {
        $set: {
          suspended: true,
          updatedAt: expect.any(Date),
        },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
    expectLatestAudit("user.suspend", "User");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/users/${targetUserId}`);
  });

  it("toggleUserSuspensionAction returns not-found edge state", async () => {
    userFindByIdMock.mockReturnValueOnce(mockMongooseModel(null));
    userFindByIdAndUpdateMock.mockResolvedValueOnce(null);

    const response = await toggleUserSuspensionAction(
      buildFormData({ userId: targetUserId, suspended: "false" }),
    );

    expectErrorState(response, "User not found.");
  });

  it("toggleUserSuspensionAction blocks admin-user suspension", async () => {
    userFindByIdMock.mockReturnValueOnce(
      mockMongooseModel({
        role: "admin",
      }),
    );

    const response = await toggleUserSuspensionAction(
      buildFormData({ userId: targetUserId, suspended: "true" }),
    );

    expectErrorState(response, "Admin accounts cannot be suspended.");
    expect(userFindByIdAndUpdateMock).not.toHaveBeenCalled();
    expect(createAdminAuditLogEntryMock).not.toHaveBeenCalled();
  });

  it("removeUserByAdminAction removes user and owned resources", async () => {
    const response = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    expect(response).toEqual({
      status: "success",
      message: "User and related data removed.",
      severity: "success",
    });
    expect(vi.mocked(clerkClient)).toHaveBeenCalledOnce();
    expect(deleteClerkUserMock).toHaveBeenCalledWith("user_123");
    expect(deleteUserCascadeMock).toHaveBeenCalledWith("user_123");
    expect(userFindByIdAndDeleteMock).toHaveBeenCalledWith(targetUserId);
    expectLatestAudit("user.remove", "User");
  });

  it("removeUserByAdminAction handles missing users", async () => {
    userFindByIdMock.mockReturnValueOnce(mockMongooseModel(null));

    const response = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    expectErrorState(response, "Unable to remove user.");
  });

  it("removeUserByAdminAction blocks admin-user deletion", async () => {
    userFindByIdMock.mockReturnValueOnce(
      mockMongooseModel({
        clerkId: "admin_1",
        email: "admin@example.com",
        username: "admin",
        role: "admin",
      }),
    );

    const response = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    expectErrorState(response, "Unable to remove user.");
    expect(deleteClerkUserMock).not.toHaveBeenCalled();
    expect(deleteUserCascadeMock).not.toHaveBeenCalled();
  });

  it("updateAdminSettingAction updates model settings", async () => {
    const response = await updateAdminSettingAction(
      buildFormData({
        key: "admin.models",
        category: "models",
        liteChatModel: "gpt-4.1-mini",
        proChatModel: "gpt-4.1",
        premiumChatModel: "gpt-5.4",
        imageModel: "gpt-image-1",
        audioModel: "gpt-audio-mini",
      }),
    );

    expect(response).toEqual({
      status: "success",
      message: "Settings updated.",
      severity: "success",
    });
    expectLatestAudit("setting.update", "AppSetting");
  });

  it("updateAdminSettingAction applies pricing and revalidates plans routes", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.pricing",
        category: "plans",
        proPrice: "19",
        premiumPrice: "39",
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.pricing" },
      expect.objectContaining({
        $set: expect.objectContaining({
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

  it("updateAdminSettingAction persists yearly discount and revalidates plans routes", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.yearlyDiscount",
        category: "plans",
        yearlyDiscount: "35",
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.yearlyDiscount" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: {
            yearlyDiscount: 35,
          },
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/plans");
    expect(revalidatePath).toHaveBeenCalledWith("/app/plans");
  });

  it("updateAdminSettingAction filters invalid persona access ids", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "persona_access_lite",
        category: "features",
        personaIds: ["strategist", "developer", "invalid-persona"],
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "persona_access_lite" },
      expect.objectContaining({
        $set: expect.objectContaining({ value: ["strategist", "developer"] }),
      }),
      expect.any(Object),
    );
  });

  it("updateAdminSettingAction parses persona overrides", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.personaOverrides",
        category: "features",
        label_strategist: "Strategist+",
        tagline_strategist: "Plan smart",
        description_strategist: "Practical strategy",
        starterPrompts_strategist: "Prompt one\nPrompt two",
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.personaOverrides" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.objectContaining({
            strategist: expect.objectContaining({
              starterPrompts: ["Prompt one", "Prompt two"],
            }),
          }),
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/personas");
    expect(revalidatePath).toHaveBeenCalledWith("/app/library");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usage");
  });

  it("updateAdminSettingAction normalizes support email and revalidates support routes", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.supportEmail",
        category: "features",
        supportEmail: "SUPPORT@DROPLET.EXAMPLE",
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.supportEmail" },
      expect.objectContaining({
        $set: expect.objectContaining({ value: "support@droplet.example" }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/privacy");
    expect(revalidatePath).toHaveBeenCalledWith("/cookies");
    expect(revalidatePath).toHaveBeenCalledWith("/app/profile");
  });

  it("updateAdminSettingAction parses FAQ content and revalidates plans pages", async () => {
    const faqFields: Record<string, string> = {
      key: "admin.faqContent",
      category: "features",
    };

    for (const faqEntry of buildFaqs()) {
      faqFields[`faqQuestion_${faqEntry.id}`] = `Question ${faqEntry.id}`;
      faqFields[`faqAnswer_${faqEntry.id}`] = `Answer ${faqEntry.id}`;
    }

    await updateAdminSettingAction(buildFormData(faqFields));

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.faqContent" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.arrayContaining([
            expect.objectContaining({
              id: 0,
              question: "Question 0",
              answer: "Answer 0",
            }),
          ]),
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/plans");
    expect(revalidatePath).toHaveBeenCalledWith("/app/plans");
  });

  it("updateAdminSettingAction parses landing content and revalidates homepage", async () => {
    const landingDefaults = getDefaultLandingContent();
    const landingFields: Record<string, string> = {
      key: "admin.landingContent",
      category: "features",
      workflowEyebrow: "Updated workflow eyebrow",
      workflowTitle: "Updated workflow title",
      workflowDescription: "Updated workflow description",
      workflowRhythmEyebrow: "Updated rhythm eyebrow",
    };

    landingDefaults.featureCards.forEach((_, index) => {
      landingFields[`featureIcon_${index}`] = `bi bi-star-${index}`;
      landingFields[`featureTitle_${index}`] = `Feature ${index}`;
      landingFields[`featureDescription_${index}`] = `Feature copy ${index}`;
    });

    landingDefaults.howItWorksSteps.forEach((_, index) => {
      landingFields[`howStep_${index}`] = `0${index + 1}`;
      landingFields[`howTitle_${index}`] = `Step ${index}`;
      landingFields[`howDescription_${index}`] = `Step copy ${index}`;
    });

    landingDefaults.workflow.rhythmCards.forEach((_, index) => {
      landingFields[`rhythmLabel_${index}`] = `Rhythm ${index}`;
      landingFields[`rhythmDetail_${index}`] = `Rhythm detail ${index}`;
    });

    await updateAdminSettingAction(buildFormData(landingFields));

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.landingContent" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.objectContaining({
            featureCards: expect.arrayContaining([
              expect.objectContaining({
                title: "Feature 0",
              }),
            ]),
            workflow: expect.objectContaining({
              title: "Updated workflow title",
            }),
          }),
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("updateAdminSettingAction parses homepage CTA and spotlight copy", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.homepageCopy",
        category: "features",
        homepageCtaHeading: "Updated CTA heading",
        homepageCtaDescription: "Updated CTA description",
        homepageCtaPrimaryLabel: "Join now",
        homepageCtaSecondaryLabel: "View plans",
        homepageSpotlightLabel: "Focus area",
        homepageSpotlightHeading: "Different work, different voices.",
        homepageSpotlightDescription:
          "Use specialist personas for specialist outcomes.",
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.homepageCopy" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: {
            ctaHeading: "Updated CTA heading",
            ctaDescription: "Updated CTA description",
            ctaPrimaryLabel: "Join now",
            ctaSecondaryLabel: "View plans",
            spotlightLabel: "Focus area",
            spotlightHeading: "Different work, different voices.",
            spotlightDescription:
              "Use specialist personas for specialist outcomes.",
          },
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("updateAdminSettingAction parses homepage featured personas", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.homepageFeaturedPersonas",
        category: "features",
        homepageFeaturedPersonaIds: [
          "teacher",
          "creator",
          "teacher",
          "invalid-id",
        ],
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.homepageFeaturedPersonas" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: ["teacher", "creator"],
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("updateAdminSettingAction falls back to default featured personas when all ids are invalid", async () => {
    await updateAdminSettingAction(
      buildFormData({
        key: "admin.homepageFeaturedPersonas",
        category: "features",
        homepageFeaturedPersonaIds: ["invalid-id"],
      }),
    );

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.homepageFeaturedPersonas" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: getDefaultHomepageFeaturedPersonas(),
        }),
      }),
      expect.any(Object),
    );
  });

  it("updateAdminSettingAction parses about content and revalidates about page", async () => {
    const aboutDefaults = getDefaultAboutContent();
    const aboutFields: Record<string, string> = {
      key: "admin.aboutContent",
      category: "features",
      aboutPageTitle: "Updated About",
      aboutPageSubtitle: "Updated About subtitle",
      aboutCtaTitle: "Updated CTA",
      aboutCtaDescription: "Updated CTA description",
      aboutCtaPrimaryLabel: "Primary action",
      aboutCtaSecondaryLabel: "Secondary action",
    };

    aboutDefaults.sections.forEach((section, index) => {
      aboutFields[`aboutEyebrow_${section.id}`] = `Eyebrow ${index}`;
      aboutFields[`aboutTitle_${section.id}`] = `Title ${index}`;
      aboutFields[`aboutParagraph1_${section.id}`] = `Paragraph one ${index}`;
      aboutFields[`aboutParagraph2_${section.id}`] = `Paragraph two ${index}`;
    });

    await updateAdminSettingAction(buildFormData(aboutFields));

    expect(appSettingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "admin.aboutContent" },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.objectContaining({
            pageTitle: "Updated About",
            sections: expect.arrayContaining([
              expect.objectContaining({
                id: "identity",
                title: "Title 0",
              }),
            ]),
          }),
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/about");
  });

  it("updateAdminSettingAction handles invalid category and missing values", async () => {
    const invalidCategory = await updateAdminSettingAction(
      buildFormData({ key: "admin.models", category: "invalid", value: "{}" }),
    );
    const missingValue = await updateAdminSettingAction(
      buildFormData({ key: "unknown.key", category: "features" }),
    );

    expectErrorState(invalidCategory, "Invalid settings category.");
    expectErrorState(missingValue, "Missing required settings value.");
  });

  it("updateAdminSettingAction handles invalid currency and theme values", async () => {
    const invalidCurrency = await updateAdminSettingAction(
      buildFormData({
        key: "admin.currencySymbol",
        category: "plans",
        currencySymbol: "GBP",
      }),
    );
    const invalidTheme = await updateAdminSettingAction(
      buildFormData({
        key: "admin.theme",
        category: "theme",
        defaultMode: "sepia",
      }),
    );

    expectErrorState(invalidCurrency, "Unable to update settings.");
    expectErrorState(invalidTheme, "Unable to update settings.");
  });

  it("createPublicPageAction creates pages and blocks duplicates", async () => {
    publicPageFindOneMock
      .mockReturnValueOnce(makeExistingPageQuery(null))
      .mockReturnValueOnce(makeLatestPageQuery({ sortOrder: 4 }));

    const success = await createPublicPageAction(
      buildFormData({ title: "About", slug: "about" }),
    );

    publicPageFindOneMock.mockReturnValueOnce(
      makeExistingPageQuery({ _id: pageId }),
    );

    const duplicate = await createPublicPageAction(
      buildFormData({ title: "About", slug: "about" }),
    );

    expect(success).toEqual({
      status: "success",
      message: "Public page created.",
      severity: "success",
    });
    expectLatestAudit("page.create", "PublicPage");
    expectErrorState(duplicate, "A page with this slug already exists.");
  });

  it("toggle/delete/sort/save public page actions enforce not-found edges", async () => {
    publicPageFindByIdAndUpdateMock.mockResolvedValueOnce(null);
    const toggleNotFound = await togglePublicPagePublishedAction(
      buildFormData({ pageId, isPublished: "false" }),
    );

    publicPageFindByIdAndDeleteMock.mockResolvedValueOnce(null);
    const deleteNotFound = await deletePublicPageAction(
      buildFormData({ pageId }),
    );

    publicPageFindByIdAndUpdateMock.mockResolvedValueOnce(null);
    const sortNotFound = await updatePublicPageSortOrderAction(
      buildFormData({ pageId, sortOrder: "8" }),
    );

    publicPageFindByIdAndUpdateMock.mockResolvedValueOnce(null);
    const saveNotFound = await savePublicPageAction(
      buildFormData({ pageId, title: "About", content: "<p>Saved</p>" }),
    );

    expectErrorState(toggleNotFound, "Page not found.");
    expectErrorState(deleteNotFound, "Page not found.");
    expectErrorState(sortNotFound, "Page not found.");
    expectErrorState(saveNotFound, "Page not found.");
  });

  it("togglePublicPagePublishedAction supports publish and unpublish success paths", async () => {
    const publish = await togglePublicPagePublishedAction(
      buildFormData({ pageId, isPublished: "true" }),
    );

    const unpublish = await togglePublicPagePublishedAction(
      buildFormData({ pageId, isPublished: "false" }),
    );

    expect(publish).toEqual({
      status: "success",
      message: "Page published.",
      severity: "success",
    });
    expect(unpublish).toEqual({
      status: "success",
      message: "Page unpublished.",
      severity: "success",
    });
    expectLatestAudit("page.unpublish", "PublicPage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/website");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/website/${pageId}`);
  });

  it("deletePublicPageAction success path logs audit and returns warning severity", async () => {
    const response = await deletePublicPageAction(buildFormData({ pageId }));

    expect(response).toEqual({
      status: "success",
      message: "Page deleted.",
      severity: "warning",
    });
    expectLatestAudit("page.delete", "PublicPage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/website");
  });

  it("updatePublicPageSortOrderAction success path logs audit and revalidates", async () => {
    const response = await updatePublicPageSortOrderAction(
      buildFormData({ pageId, sortOrder: "8" }),
    );

    expect(response).toEqual({
      status: "success",
      message: "Sort order updated.",
      severity: "success",
    });
    expectLatestAudit("page.sort", "PublicPage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/website");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/website/${pageId}`);
  });

  it("savePublicPageAction success path logs audit and revalidates", async () => {
    const response = await savePublicPageAction(
      buildFormData({ pageId, title: "About", content: "<p>Saved</p>" }),
    );

    expect(response).toEqual({
      status: "success",
      message: "Page content saved.",
      severity: "success",
    });
    expectLatestAudit("page.save", "PublicPage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/website");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/website/${pageId}`);
  });

  it("bulk actions succeed and write expected audit entries", async () => {
    const suspend = await bulkSuspendUsersAction(
      buildFormData({ userIds: [targetUserId, secondUserId] }),
    );

    userFindByIdMock.mockImplementation((id: unknown) => {
      const value =
        String(id) === secondUserId
          ? { clerkId: "user_456", email: "two@example.com", username: "two" }
          : { clerkId: "user_123", email: "one@example.com", username: "one" };
      return mockMongooseModel(value);
    });

    const remove = await bulkRemoveUsersAction(
      buildFormData({ userIds: [targetUserId, secondUserId] }),
    );
    const deleteTransactions = await bulkDeleteTransactionsAction(
      buildFormData({ transactionIds: ["txn_1", "txn_2"] }),
    );
    const deletePages = await bulkDeletePublicPagesAction(
      buildFormData({ pageIds: ["page_1", "page_2"] }),
    );
    const publish = await bulkPublishPublicPagesAction(
      buildFormData({ pageIds: ["page_1", "page_2", "page_3"] }),
    );
    const unpublish = await bulkUnpublishPublicPagesAction(
      buildFormData({ pageIds: ["page_1"] }),
    );

    expect(suspend).toEqual(
      expect.objectContaining({ status: "success", severity: "warning" }),
    );
    expect(remove).toEqual(
      expect.objectContaining({
        status: "success",
        message: "2 users removed.",
      }),
    );
    expect(deleteTransactions).toEqual(
      expect.objectContaining({
        status: "success",
        message: "3 transactions removed.",
      }),
    );
    expect(deletePages).toEqual(
      expect.objectContaining({
        status: "success",
        message: "2 pages deleted.",
      }),
    );
    expect(publish).toEqual(
      expect.objectContaining({
        status: "success",
        message: "3 pages published.",
      }),
    );
    expect(unpublish).toEqual(
      expect.objectContaining({
        status: "success",
        message: "3 pages unpublished.",
      }),
    );
  });

  it("bulkRemoveUsersAction skips admin ids and removes only client users", async () => {
    userFindMock.mockReturnValueOnce(
      mockMongooseModel([
        { _id: targetUserId, role: "client" },
        { _id: secondUserId, role: "admin" },
      ]),
    );

    const response = await bulkRemoveUsersAction(
      buildFormData({ userIds: [targetUserId, secondUserId] }),
    );

    expect(response).toEqual({
      status: "success",
      message: "1 users removed. 1 admin user skipped.",
      severity: "warning",
    });
    expect(deleteClerkUserMock).toHaveBeenCalledTimes(1);
    expect(deleteClerkUserMock).toHaveBeenCalledWith("user_123");
  });

  it("bulkSuspendUsersAction skips admin ids and suspends only client users", async () => {
    userFindMock.mockReturnValueOnce(
      mockMongooseModel([
        { _id: targetUserId, role: "client" },
        { _id: secondUserId, role: "admin" },
      ]),
    );
    userUpdateManyMock.mockResolvedValueOnce({ modifiedCount: 1 });

    const response = await bulkSuspendUsersAction(
      buildFormData({ userIds: [targetUserId, secondUserId] }),
    );

    expect(response).toEqual({
      status: "success",
      message: "1 users suspended. 1 admin user skipped.",
      severity: "warning",
    });
    expect(userUpdateManyMock).toHaveBeenCalledWith(
      { _id: { $in: [targetUserId] } },
      {
        $set: {
          suspended: true,
          updatedAt: expect.any(Date),
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );
  });

  it("bulk actions handle missing ids edge inputs", async () => {
    const noSuspendIds = await bulkSuspendUsersAction(new FormData());
    const noRemoveIds = await bulkRemoveUsersAction(new FormData());
    const noTransactionIds = await bulkDeleteTransactionsAction(new FormData());
    const noPageIdsDelete = await bulkDeletePublicPagesAction(new FormData());
    const noPageIdsPublish = await bulkPublishPublicPagesAction(new FormData());
    const noPageIdsUnpublish = await bulkUnpublishPublicPagesAction(
      new FormData(),
    );

    expectErrorState(noSuspendIds, "Unable to suspend selected users.");
    expectErrorState(noRemoveIds, "Unable to remove selected users.");
    expectErrorState(
      noTransactionIds,
      "Unable to remove selected transactions.",
    );
    expectErrorState(noPageIdsDelete, "Unable to delete selected pages.");
    expectErrorState(noPageIdsPublish, "Unable to publish selected pages.");
    expectErrorState(noPageIdsUnpublish, "Unable to unpublish selected pages.");
  });

  it("removeUserByAdminAction handles downstream clerk and final delete failures", async () => {
    deleteClerkUserMock.mockRejectedValueOnce(new Error("clerk unavailable"));
    const clerkFailure = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    deleteClerkUserMock.mockResolvedValueOnce(undefined);
    userFindByIdAndDeleteMock.mockResolvedValueOnce(null);
    const deleteFailure = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    expectErrorState(clerkFailure, "Unable to remove user.");
    expectErrorState(deleteFailure, "Unable to remove user.");
  });

  it("bulkRemoveUsersAction reports partial completion when one selected user is missing", async () => {
    userFindMock.mockReturnValueOnce(
      mockMongooseModel([{ _id: targetUserId, role: "client" }]),
    );

    const response = await bulkRemoveUsersAction(
      buildFormData({ userIds: [targetUserId, secondUserId] }),
    );

    expect(response).toEqual({
      status: "success",
      message: "1 users removed. 1 user not found.",
      severity: "warning",
    });
  });

  it("removeUserByAdminAction checks user existence by id before deletion", async () => {
    const ownedUser = createTestUser({
      _id: targetUserId,
      clerkId: "user_123",
      email: "owner@example.com",
      username: "owner",
    });

    userFindByIdMock.mockReturnValueOnce(
      mockMongooseModel({
        clerkId: ownedUser.clerkId,
        email: ownedUser.email,
        username: ownedUser.username,
      }),
    );

    const response = await removeUserByAdminAction(
      buildFormData({ userId: targetUserId }),
    );

    expect(response).toEqual(
      expect.objectContaining({ status: "success", severity: "success" }),
    );
    expect(userFindByIdMock).toHaveBeenCalledWith(targetUserId);
  });
});
