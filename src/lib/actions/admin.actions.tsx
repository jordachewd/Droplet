"use server";

import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDefaultAboutContent } from "@/constants/about-data";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PERSONAS, VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import { buildFaqs } from "@/constants/faqs";
import { getDefaultHomepageFeaturedPersonas } from "@/constants/homepage-copy";
import { getDefaultLandingContent } from "@/constants/landing-data";
import { STOP_REASON_CODES } from "@/constants/stop-reasons";
import AppSetting from "@/lib/database/models/app-setting.model";
import PublicPage from "@/lib/database/models/public-page.model";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";
import { AdminActionState } from "@/components/admin/admin-action-state";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndedReason } from "@/types/TaskData.d";
import { z } from "zod";

const requiredStringSchema = z.string().trim().min(1);
const numericFieldSchema = z.coerce.number().finite();
const supportEmailSchema = z.string().trim().email();
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
  } catch (error) {
    logAdminActionError("parseJsonValue", error);
    return rawValue;
  }
}

function parseStarterPromptLines(rawValue: unknown): string[] {
  if (typeof rawValue !== "string") {
    return [];
  }

  return rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function getNumericField(formData: FormData, fieldName: string): number {
  const rawValue = getStringField(formData, fieldName);
  const parsedValue = numericFieldSchema.safeParse(rawValue);

  if (!parsedValue.success) {
    throw new Error(`Invalid numeric field: ${fieldName}`);
  }

  return parsedValue.data;
}

function getMultiStringField(formData: FormData, fieldName: string): string[] {
  const values = formData
    .getAll(fieldName)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return values;
}

function resolveActionFormData(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): FormData {
  if (previousStateOrFormData instanceof FormData) {
    return previousStateOrFormData;
  }

  if (maybeFormData instanceof FormData) {
    return maybeFormData;
  }

  throw new Error("Form data is required.");
}

function successState(
  message: string,
  severity: AdminActionState["severity"] = "success",
): AdminActionState {
  return {
    status: "success",
    message,
    severity,
  };
}

function errorState(message: string): AdminActionState {
  return {
    status: "error",
    message,
    severity: "error",
  };
}

function logAdminActionError(context: string, error: unknown): void {
  process.stderr.write(
    `[admin.actions] ${context}: ${error instanceof Error ? error.message : "unknown"}\n`,
  );
}

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
    .select("clerkId email username")
    .lean();

  if (!targetUser) {
    throw new Error("User not found.");
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
      },
    };
  }

  if (key === "admin.trialLimits") {
    return {
      promptsPerConversation: getNumericField(formData, "trialPrompts"),
      images: getNumericField(formData, "trialImages"),
      audio: getNumericField(formData, "trialAudio"),
    };
  }

  if (key === "admin.theme") {
    const defaultMode = getStringField(formData, "defaultMode");

    if (defaultMode !== "light" && defaultMode !== "dark") {
      throw new Error("Invalid default theme mode.");
    }

    return { defaultMode };
  }

  if (key === "admin.supportEmail") {
    const parsedSupportEmail = supportEmailSchema.safeParse(
      getStringField(formData, "supportEmail"),
    );

    if (!parsedSupportEmail.success) {
      throw new Error("Invalid support email.");
    }

    return parsedSupportEmail.data.toLowerCase();
  }

  if (key === "admin.stopReasonMessages") {
    return STOP_REASON_CODES.reduce(
      (accumulator, stopReasonCode) => {
        accumulator[stopReasonCode] = getStringField(formData, stopReasonCode);
        return accumulator;
      },
      {} as Record<TaskEndedReason, string>,
    );
  }

  if (key === "admin.faqContent") {
    return buildFaqs().map((faqEntry) => ({
      id: faqEntry.id,
      question: getStringField(formData, `faqQuestion_${faqEntry.id}`),
      answer: getStringField(formData, `faqAnswer_${faqEntry.id}`),
    }));
  }

  if (key === "admin.heroContent") {
    return {
      heading: getStringField(formData, "heroHeading"),
      subheading: getStringField(formData, "heroSubheading"),
      ctaLabel: getStringField(formData, "heroCtaLabel"),
      imageAlt: getStringField(formData, "heroImageAlt"),
    };
  }

  if (key === "admin.homepageCopy") {
    return {
      ctaHeading: getStringField(formData, "homepageCtaHeading"),
      ctaDescription: getStringField(formData, "homepageCtaDescription"),
      ctaPrimaryLabel: getStringField(formData, "homepageCtaPrimaryLabel"),
      ctaSecondaryLabel: getStringField(formData, "homepageCtaSecondaryLabel"),
      spotlightLabel: getStringField(formData, "homepageSpotlightLabel"),
      spotlightHeading: getStringField(formData, "homepageSpotlightHeading"),
      spotlightDescription: getStringField(
        formData,
        "homepageSpotlightDescription",
      ),
    };
  }

  if (key === "admin.homepageFeaturedPersonas") {
    const selectedPersonaIds = formData
      .getAll("homepageFeaturedPersonaIds")
      .filter(
        (value): value is PersonaId =>
          typeof value === "string" &&
          VALID_PERSONA_ID_SET.has(value as PersonaId),
      );

    const dedupedPersonaIds = Array.from(new Set(selectedPersonaIds));

    return dedupedPersonaIds.length > 0
      ? dedupedPersonaIds
      : getDefaultHomepageFeaturedPersonas();
  }

  if (key === "admin.landingContent") {
    const defaults = getDefaultLandingContent();

    return {
      featureCards: defaults.featureCards.map((_, index) => ({
        icon: getStringField(formData, `featureIcon_${index}`),
        title: getStringField(formData, `featureTitle_${index}`),
        description: getStringField(formData, `featureDescription_${index}`),
      })),
      howItWorksSteps: defaults.howItWorksSteps.map((_, index) => ({
        step: getStringField(formData, `howStep_${index}`),
        title: getStringField(formData, `howTitle_${index}`),
        description: getStringField(formData, `howDescription_${index}`),
      })),
      workflow: {
        eyebrow: getStringField(formData, "workflowEyebrow"),
        title: getStringField(formData, "workflowTitle"),
        description: getStringField(formData, "workflowDescription"),
        rhythmEyebrow: getStringField(formData, "workflowRhythmEyebrow"),
        rhythmCards: defaults.workflow.rhythmCards.map((_, index) => ({
          label: getStringField(formData, `rhythmLabel_${index}`),
          detail: getStringField(formData, `rhythmDetail_${index}`),
        })),
      },
    };
  }

  if (key === "admin.aboutContent") {
    const defaults = getDefaultAboutContent();

    return {
      pageTitle: getStringField(formData, "aboutPageTitle"),
      pageSubtitle: getStringField(formData, "aboutPageSubtitle"),
      sections: defaults.sections.map((section) => ({
        id: section.id,
        visualType: section.visualType,
        eyebrow: getStringField(formData, `aboutEyebrow_${section.id}`),
        title: getStringField(formData, `aboutTitle_${section.id}`),
        paragraphs: [
          getStringField(formData, `aboutParagraph1_${section.id}`),
          getStringField(formData, `aboutParagraph2_${section.id}`),
        ],
      })),
      ctaTitle: getStringField(formData, "aboutCtaTitle"),
      ctaDescription: getStringField(formData, "aboutCtaDescription"),
      ctaPrimaryLabel: getStringField(formData, "aboutCtaPrimaryLabel"),
      ctaSecondaryLabel: getStringField(formData, "aboutCtaSecondaryLabel"),
    };
  }

  if (key === "admin.promoContent") {
    return {
      promoTitlePro: getStringField(formData, "promoTitlePro"),
      promoTitlePremium: getStringField(formData, "promoTitlePremium"),
      promoDescriptionPro: getStringField(formData, "promoDescriptionPro"),
      promoDescriptionPremium: getStringField(
        formData,
        "promoDescriptionPremium",
      ),
      promoUpgradeCta: getStringField(formData, "promoUpgradeCta"),
      promoAdminLabel: getStringField(formData, "promoAdminLabel"),
      promoAdminDescription: getStringField(formData, "promoAdminDescription"),
      promoSuspensionTitle: getStringField(formData, "promoSuspensionTitle"),
      promoSuspensionDescription: getStringField(
        formData,
        "promoSuspensionDescription",
      ),
      promoFreeLabel: getStringField(formData, "promoFreeLabel"),
      promoCurrentPlanLabel: getStringField(formData, "promoCurrentPlanLabel"),
      promoUpgradeMessage: getStringField(formData, "promoUpgradeMessage"),
      promoTrialLabel: getStringField(formData, "promoTrialLabel"),
      promoPersonaUpgrade: getStringField(formData, "promoPersonaUpgrade"),
      promoPersonaUpgradeFallback: getStringField(
        formData,
        "promoPersonaUpgradeFallback",
      ),
      promoContactSupportCta: getStringField(
        formData,
        "promoContactSupportCta",
      ),
      chatConversationEndedLabel: getStringField(
        formData,
        "chatConversationEndedLabel",
      ),
      chatStartConversationCta: getStringField(
        formData,
        "chatStartConversationCta",
      ),
      chatUpgradePlanCta: getStringField(formData, "chatUpgradePlanCta"),
      chatContactSupportCta: getStringField(formData, "chatContactSupportCta"),
      chatIntroSubheading: getStringField(formData, "chatIntroSubheading"),
      chatInputPlaceholder: getStringField(formData, "chatInputPlaceholder"),
      plansSubscribeCta: getStringField(formData, "plansSubscribeCta"),
      planPopularBadge: getStringField(formData, "planPopularBadge"),
    };
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

  if (key === "admin.personaOverrides") {
    return PERSONAS.reduce(
      (accumulator, persona) => {
        const labelField = formData.get(`label_${persona.id}`);
        const taglineField = formData.get(`tagline_${persona.id}`);
        const descriptionField = formData.get(`description_${persona.id}`);
        const starterPromptsField = formData.get(
          `starterPrompts_${persona.id}`,
        );
        const starterPrompts = parseStarterPromptLines(starterPromptsField);

        accumulator[persona.id] = {
          label:
            typeof labelField === "string" && labelField.trim().length > 0
              ? labelField.trim()
              : persona.label,
          tagline:
            typeof taglineField === "string" && taglineField.trim().length > 0
              ? taglineField.trim()
              : persona.tagline,
          description:
            typeof descriptionField === "string" &&
            descriptionField.trim().length > 0
              ? descriptionField.trim()
              : persona.description,
          starterPrompts:
            starterPrompts.length > 0
              ? starterPrompts
              : [...persona.starterPrompts],
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
    );
  }

  return null;
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
    const targetUserId = getStringField(formData, "userId");

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

export async function updateAdminSettingAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const key = getStringField(formData, "key");
    const categoryValue = getStringField(formData, "category");
    const parsedCategory = adminSettingCategorySchema.safeParse(categoryValue);

    if (!parsedCategory.success) {
      return errorState("Invalid settings category.");
    }

    const category = parsedCategory.data;
    const rawValue = formData.get("value");
    const parsedValue =
      typeof rawValue === "string" && rawValue.trim().length > 0
        ? parseJsonValue(rawValue.trim())
        : parseStructuredAdminSettingValue({ key, formData });

    if (parsedValue === null) {
      return errorState("Missing required settings value.");
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

    if (key === "admin.personaOverrides") {
      revalidatePath("/");
      revalidatePath("/about");
      revalidatePath("/personas");
      revalidatePath("/app");
      revalidatePath("/app/new");
      revalidatePath("/app/personas");
      revalidatePath("/app/library");
      revalidatePath("/admin/usage");
    }

    if (key === "admin.supportEmail") {
      revalidatePath("/");
      revalidatePath("/plans");
      revalidatePath("/privacy");
      revalidatePath("/cookies");
      revalidatePath("/app");
      revalidatePath("/app/new");
      revalidatePath("/app/plans");
      revalidatePath("/app/profile");
    }

    if (key === "admin.stopReasonMessages") {
      revalidatePath("/app");
      revalidatePath("/app/new");
    }

    if (key === "admin.faqContent") {
      revalidatePath("/plans");
      revalidatePath("/app/plans");
    }

    if (
      key === "admin.heroContent" ||
      key === "admin.landingContent" ||
      key === "admin.homepageCopy" ||
      key === "admin.homepageFeaturedPersonas"
    ) {
      revalidatePath("/");
    }

    if (key === "admin.aboutContent") {
      revalidatePath("/about");
    }

    if (key === "admin.promoContent") {
      revalidatePath("/plans");
      revalidatePath("/app");
      revalidatePath("/app/new");
      revalidatePath("/app/personas");
      revalidatePath("/app/profile");
      revalidatePath("/app/plans");
    }

    return successState("Settings updated.");
  } catch (error) {
    logAdminActionError("updateAdminSettingAction", error);
    return errorState("Unable to update settings.");
  }
}

export async function createPublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const title = getStringField(formData, "title");
    const slug = getStringField(formData, "slug");

    await connectToDatabase();

    const existingPage = await PublicPage.findOne({ slug })
      .select("_id")
      .lean();

    if (existingPage) {
      return errorState("A page with this slug already exists.");
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

    return successState("Public page created.");
  } catch (error) {
    logAdminActionError("createPublicPageAction", error);
    return errorState("Unable to create page.");
  }
}

export async function togglePublicPagePublishedAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
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
      return errorState("Page not found.");
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

    return successState(isPublished ? "Page published." : "Page unpublished.");
  } catch (error) {
    logAdminActionError("togglePublicPagePublishedAction", error);
    return errorState("Unable to change page publish state.");
  }
}

export async function deletePublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const pageId = getStringField(formData, "pageId");

    await connectToDatabase();

    const deletedPage = await PublicPage.findByIdAndDelete(pageId);

    if (!deletedPage) {
      return errorState("Page not found.");
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

    return successState("Page deleted.", "warning");
  } catch (error) {
    logAdminActionError("deletePublicPageAction", error);
    return errorState("Unable to delete page.");
  }
}

export async function updatePublicPageSortOrderAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
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
      return errorState("Page not found.");
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

    return successState("Sort order updated.");
  } catch (error) {
    logAdminActionError("updatePublicPageSortOrderAction", error);
    return errorState("Unable to update sort order.");
  }
}

export async function savePublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
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
      return errorState("Page not found.");
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

    return successState("Page content saved.");
  } catch (error) {
    logAdminActionError("savePublicPageAction", error);
    return errorState("Unable to save page content.");
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
    const userIds = getMultiStringField(formData, "userIds");

    await connectToDatabase();

    const result = await User.updateMany(
      { _id: { $in: userIds } },
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

    await createAdminAuditLogEntry({
      adminId,
      action: "user.bulk_suspend",
      targetType: "User",
      targetId: userIds.join(","),
      details: {
        selectedCount: userIds.length,
        modifiedCount: result.modifiedCount ?? 0,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return successState(
      `${result.modifiedCount ?? 0} users suspended.`,
      "warning",
    );
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
    const userIds = getMultiStringField(formData, "userIds");

    await connectToDatabase();

    let removedCount = 0;

    for (const targetUserId of userIds) {
      await removeUserByAdmin({ adminId, targetUserId });
      removedCount += 1;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return successState(`${removedCount} users removed.`, "warning");
  } catch (error) {
    logAdminActionError("bulkRemoveUsersAction", error);
    return errorState("Unable to remove selected users.");
  }
}

export async function bulkDeleteTransactionsAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const transactionIds = getMultiStringField(formData, "transactionIds");

    await connectToDatabase();

    const result = await Transaction.deleteMany({
      _id: { $in: transactionIds },
    });

    await createAdminAuditLogEntry({
      adminId,
      action: "transaction.bulk_delete",
      targetType: "Transaction",
      targetId: transactionIds.join(","),
      details: {
        selectedCount: transactionIds.length,
        deletedCount: result.deletedCount ?? 0,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");

    return successState(
      `${result.deletedCount ?? 0} transactions removed.`,
      "warning",
    );
  } catch (error) {
    logAdminActionError("bulkDeleteTransactionsAction", error);
    return errorState("Unable to remove selected transactions.");
  }
}

export async function bulkDeletePublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const pageIds = getMultiStringField(formData, "pageIds");

    await connectToDatabase();

    const result = await PublicPage.deleteMany({ _id: { $in: pageIds } });

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_delete",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        deletedCount: result.deletedCount ?? 0,
      },
    });

    revalidatePath("/admin/website");

    return successState(
      `${result.deletedCount ?? 0} pages deleted.`,
      "warning",
    );
  } catch (error) {
    logAdminActionError("bulkDeletePublicPagesAction", error);
    return errorState("Unable to delete selected pages.");
  }
}

export async function bulkPublishPublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const pageIds = getMultiStringField(formData, "pageIds");

    await connectToDatabase();

    const result = await PublicPage.updateMany(
      { _id: { $in: pageIds } },
      {
        $set: {
          isPublished: true,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_publish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount: result.modifiedCount ?? 0,
      },
    });

    revalidatePath("/admin/website");

    return successState(`${result.modifiedCount ?? 0} pages published.`);
  } catch (error) {
    logAdminActionError("bulkPublishPublicPagesAction", error);
    return errorState("Unable to publish selected pages.");
  }
}

export async function bulkUnpublishPublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const pageIds = getMultiStringField(formData, "pageIds");

    await connectToDatabase();

    const result = await PublicPage.updateMany(
      { _id: { $in: pageIds } },
      {
        $set: {
          isPublished: false,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_unpublish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount: result.modifiedCount ?? 0,
      },
    });

    revalidatePath("/admin/website");

    return successState(`${result.modifiedCount ?? 0} pages unpublished.`);
  } catch (error) {
    logAdminActionError("bulkUnpublishPublicPagesAction", error);
    return errorState("Unable to unpublish selected pages.");
  }
}
