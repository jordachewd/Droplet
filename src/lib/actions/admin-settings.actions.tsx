"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { getDefaultAboutContent } from "@/constants/about-data";
import { PERSONAS, VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import { buildFaqs } from "@/constants/faqs";
import { getDefaultHomepageFeaturedPersonas } from "@/constants/homepage-copy";
import { getDefaultLandingContent } from "@/constants/landing-data";
import { STOP_REASON_CODES } from "@/constants/stop-reasons";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import { clearConfigCache } from "@/lib/utils/config-cache";
import type { AdminActionState } from "@/components/admin/admin-action-state";
import {
  adminSettingCategorySchema,
  currencySymbolSchema,
  errorState,
  getNumericField,
  getStringField,
  logAdminActionError,
  PERSONA_ACCESS_KEYS,
  resolveActionFormData,
  successState,
  supportEmailSchema,
} from "@/lib/actions/admin-action-helpers";
import type { PersonaId } from "@/types/PersonaData.d";
import type { TaskEndedReason } from "@/types/TaskData.d";

function getTrimmedOptionalStringField(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

  if (key === "admin.yearlyDiscount") {
    const yearlyDiscount = getNumericField(formData, "yearlyDiscount");

    if (yearlyDiscount < 0 || yearlyDiscount > 100) {
      throw new Error("Invalid yearly discount value.");
    }

    return {
      yearlyDiscount,
    };
  }

  if (key === "admin.stripePriceIds") {
    return {
      proMonthly: getTrimmedOptionalStringField(formData, "proMonthlyPriceId"),
      proYearly: getTrimmedOptionalStringField(formData, "proYearlyPriceId"),
      premiumMonthly: getTrimmedOptionalStringField(
        formData,
        "premiumMonthlyPriceId",
      ),
      premiumYearly: getTrimmedOptionalStringField(
        formData,
        "premiumYearlyPriceId",
      ),
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
      key === "admin.yearlyDiscount" ||
      key === "admin.stripePriceIds" ||
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
    }

    if (key === "admin.personaOverrides") {
      revalidatePath("/");
      revalidatePath("/about");
      revalidatePath("/personas");
      revalidatePath("/app");
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
