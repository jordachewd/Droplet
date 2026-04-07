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
import { clearConfigCache } from "@/lib/utils/config-cache";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { AdminActionState } from "@/components/admin/admin-action-state";
import { PersonaId } from "@/types/PersonaData.d";
import { TaskEndedReason } from "@/types/TaskData.d";
import { z } from "zod";

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
const booleanStringFieldSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const finiteNumericStringFieldSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value), {
    message: "Invalid numeric value.",
  });
const removeUserByAdminActionSchema = z
  .object({
    userId: nonEmptyStringSchema,
  })
  .strict();
const createPublicPageActionSchema = z
  .object({
    title: nonEmptyStringSchema,
    slug: nonEmptyStringSchema,
  })
  .strict();
const deletePublicPageActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
  })
  .strict();
const savePublicPageActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    content: nonEmptyStringSchema,
  })
  .strict();
const toggleUserSuspensionActionSchema = z
  .object({
    userId: nonEmptyStringSchema,
    suspended: booleanStringFieldSchema,
  })
  .strict();
const togglePublicPagePublishedActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    isPublished: booleanStringFieldSchema,
  })
  .strict();
const updatePublicPageSortOrderActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    sortOrder: finiteNumericStringFieldSchema,
  })
  .strict();
const bulkSuspendUsersActionSchema = z
  .object({
    userIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
const bulkRemoveUsersActionSchema = z
  .object({
    userIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
const bulkDeleteTransactionsActionSchema = z
  .object({
    transactionIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
const bulkDeletePublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
const bulkPublishPublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
const bulkUnpublishPublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();

type RemoveUserByAdminActionInput = z.infer<
  typeof removeUserByAdminActionSchema
>;
type CreatePublicPageActionInput = z.infer<typeof createPublicPageActionSchema>;
type DeletePublicPageActionInput = z.infer<typeof deletePublicPageActionSchema>;
type SavePublicPageActionInput = z.infer<typeof savePublicPageActionSchema>;
type ToggleUserSuspensionActionInput = z.infer<
  typeof toggleUserSuspensionActionSchema
>;
type TogglePublicPagePublishedActionInput = z.infer<
  typeof togglePublicPagePublishedActionSchema
>;
type UpdatePublicPageSortOrderActionInput = z.infer<
  typeof updatePublicPageSortOrderActionSchema
>;
type BulkSuspendUsersActionInput = z.infer<typeof bulkSuspendUsersActionSchema>;
type BulkRemoveUsersActionInput = z.infer<typeof bulkRemoveUsersActionSchema>;
type BulkDeleteTransactionsActionInput = z.infer<
  typeof bulkDeleteTransactionsActionSchema
>;
type BulkDeletePublicPagesActionInput = z.infer<
  typeof bulkDeletePublicPagesActionSchema
>;
type BulkPublishPublicPagesActionInput = z.infer<
  typeof bulkPublishPublicPagesActionSchema
>;
type BulkUnpublishPublicPagesActionInput = z.infer<
  typeof bulkUnpublishPublicPagesActionSchema
>;

function getStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  const parsedValue = nonEmptyStringSchema.safeParse(value);

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

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

function withSummaryDetails(
  baseMessage: string,
  detailMessages: string[],
): string {
  const nonEmptyDetails = detailMessages.filter(
    (detail) => detail.trim().length > 0,
  );

  if (nonEmptyDetails.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} ${nonEmptyDetails.join(" ")}`;
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
    clearConfigCache();

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
      revalidatePath("/app/new");
    }

    if (key === "admin.personaOverrides") {
      revalidatePath("/");
      revalidatePath("/about");
      revalidatePath("/personas");
      revalidatePath("/app");
      revalidatePath("/app/new");
      revalidatePath("/app/new");
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
      revalidatePath("/app/new");
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
    const parsedInput = createPublicPageActionSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
    });

    if (!parsedInput.success) {
      return errorState("Page title and slug are required.");
    }

    const { title, slug }: CreatePublicPageActionInput = parsedInput.data;

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
    const parsedInput = togglePublicPagePublishedActionSchema.safeParse({
      pageId: formData.get("pageId"),
      isPublished: formData.get("isPublished"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection and publish state are required.");
    }

    const { pageId, isPublished }: TogglePublicPagePublishedActionInput =
      parsedInput.data;

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
    const parsedInput = deletePublicPageActionSchema.safeParse({
      pageId: formData.get("pageId"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection is required.");
    }

    const { pageId }: DeletePublicPageActionInput = parsedInput.data;

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
    const parsedInput = updatePublicPageSortOrderActionSchema.safeParse({
      pageId: formData.get("pageId"),
      sortOrder: formData.get("sortOrder"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection and sort order are required.");
    }

    const { pageId, sortOrder }: UpdatePublicPageSortOrderActionInput =
      parsedInput.data;

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
    const parsedInput = savePublicPageActionSchema.safeParse({
      pageId: formData.get("pageId"),
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsedInput.success) {
      return errorState("Page ID, title, and content are required.");
    }

    const { pageId, title, content }: SavePublicPageActionInput =
      parsedInput.data;

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
    const parsedInput = bulkDeleteTransactionsActionSchema.safeParse({
      transactionIds: formData
        .getAll("transactionIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to remove selected transactions.");
    }

    const { transactionIds }: BulkDeleteTransactionsActionInput =
      parsedInput.data;

    await connectToDatabase();

    const result = await Transaction.deleteMany({
      _id: { $in: transactionIds },
    });
    const deletedCount = result.deletedCount ?? 0;
    const notFoundCount = Math.max(transactionIds.length - deletedCount, 0);
    const message = withSummaryDetails(
      `${deletedCount} transactions removed.`,
      [
        notFoundCount > 0
          ? `${notFoundCount} ${pluralize(notFoundCount, "transaction")} not found.`
          : "",
      ],
    );

    await createAdminAuditLogEntry({
      adminId,
      action: "transaction.bulk_delete",
      targetType: "Transaction",
      targetId: transactionIds.join(","),
      details: {
        selectedCount: transactionIds.length,
        deletedCount,
        notFoundCount,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");

    return successState(message, "warning");
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
    const parsedInput = bulkDeletePublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to delete selected pages.");
    }

    const { pageIds }: BulkDeletePublicPagesActionInput = parsedInput.data;

    await connectToDatabase();

    const result = await PublicPage.deleteMany({ _id: { $in: pageIds } });
    const deletedCount = result.deletedCount ?? 0;
    const notFoundCount = Math.max(pageIds.length - deletedCount, 0);
    const message = withSummaryDetails(`${deletedCount} pages deleted.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_delete",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        deletedCount,
        notFoundCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message, "warning");
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
    const parsedInput = bulkPublishPublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to publish selected pages.");
    }

    const { pageIds }: BulkPublishPublicPagesActionInput = parsedInput.data;

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
    const modifiedCount = result.modifiedCount ?? 0;
    const matchedCount = result.matchedCount ?? modifiedCount;
    const notFoundCount = Math.max(pageIds.length - matchedCount, 0);
    const alreadyPublishedCount = Math.max(matchedCount - modifiedCount, 0);
    const message = withSummaryDetails(`${modifiedCount} pages published.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
      alreadyPublishedCount > 0
        ? `${alreadyPublishedCount} ${pluralize(alreadyPublishedCount, "page")} already published.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_publish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount,
        matchedCount,
        notFoundCount,
        alreadyPublishedCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message);
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
    const parsedInput = bulkUnpublishPublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to unpublish selected pages.");
    }

    const { pageIds }: BulkUnpublishPublicPagesActionInput = parsedInput.data;

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
    const modifiedCount = result.modifiedCount ?? 0;
    const matchedCount = result.matchedCount ?? modifiedCount;
    const notFoundCount = Math.max(pageIds.length - matchedCount, 0);
    const alreadyUnpublishedCount = Math.max(matchedCount - modifiedCount, 0);
    const message = withSummaryDetails(`${modifiedCount} pages unpublished.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
      alreadyUnpublishedCount > 0
        ? `${alreadyUnpublishedCount} ${pluralize(alreadyUnpublishedCount, "page")} already unpublished.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_unpublish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount,
        matchedCount,
        notFoundCount,
        alreadyUnpublishedCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message);
  } catch (error) {
    logAdminActionError("bulkUnpublishPublicPagesAction", error);
    return errorState("Unable to unpublish selected pages.");
  }
}
