import "server-only";

import {
  AboutContent,
  AboutContentSection,
  getDefaultAboutContent,
} from "@/constants/about-data";
import { getDefaultHeroContent, HeroContent } from "@/constants/hero-content";
import {
  getDefaultLandingContent,
  LandingContent,
  LandingFeatureCard,
  LandingHowItWorksStep,
  LandingWorkflowCopy,
  LandingWorkflowRhythmCard,
} from "@/constants/landing-data";
import {
  getDefaultHomepageCopy,
  getDefaultHomepageFeaturedPersonas,
  HomepageCopy,
} from "@/constants/homepage-copy";
import { VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getCachedConfigValue } from "@/lib/utils/config-cache";
import { isObjectRecord } from "@/lib/utils/type-guards";
import { PersonaId } from "@/types/PersonaData.d";

type AppSettingRecord = {
  key: string;
  value?: unknown;
};

export interface LandingPageContent {
  heroContent: HeroContent;
  landingContent: LandingContent;
  homepageCopy: HomepageCopy;
  homepageFeaturedPersonaIds: PersonaId[];
}

function normalizeText({
  value,
  fallback,
}: {
  value: unknown;
  fallback: string;
}): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function normalizeHeroContent(value: unknown): HeroContent {
  const defaults = getDefaultHeroContent();

  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    heading: normalizeText({
      value: value.heading,
      fallback: defaults.heading,
    }),
    subheading: normalizeText({
      value: value.subheading,
      fallback: defaults.subheading,
    }),
    ctaLabel: normalizeText({
      value: value.ctaLabel,
      fallback: defaults.ctaLabel,
    }),
    imageAlt: normalizeText({
      value: value.imageAlt,
      fallback: defaults.imageAlt,
    }),
  };
}

function normalizeHomepageCopy(value: unknown): HomepageCopy {
  const defaults = getDefaultHomepageCopy();

  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    ctaHeading: normalizeText({
      value: value.ctaHeading,
      fallback: defaults.ctaHeading,
    }),
    ctaDescription: normalizeText({
      value: value.ctaDescription,
      fallback: defaults.ctaDescription,
    }),
    ctaPrimaryLabel: normalizeText({
      value: value.ctaPrimaryLabel,
      fallback: defaults.ctaPrimaryLabel,
    }),
    ctaSecondaryLabel: normalizeText({
      value: value.ctaSecondaryLabel,
      fallback: defaults.ctaSecondaryLabel,
    }),
    spotlightLabel: normalizeText({
      value: value.spotlightLabel,
      fallback: defaults.spotlightLabel,
    }),
    spotlightHeading: normalizeText({
      value: value.spotlightHeading,
      fallback: defaults.spotlightHeading,
    }),
    spotlightDescription: normalizeText({
      value: value.spotlightDescription,
      fallback: defaults.spotlightDescription,
    }),
  };
}

function normalizeHomepageFeaturedPersonaIds(value: unknown): PersonaId[] {
  const defaults = getDefaultHomepageFeaturedPersonas();

  if (!Array.isArray(value)) {
    return defaults;
  }

  const resolvedPersonaIds: PersonaId[] = [];
  const seenPersonaIds = new Set<PersonaId>();

  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      !VALID_PERSONA_ID_SET.has(entry as PersonaId)
    ) {
      continue;
    }

    const personaId = entry as PersonaId;

    if (seenPersonaIds.has(personaId)) {
      continue;
    }

    seenPersonaIds.add(personaId);
    resolvedPersonaIds.push(personaId);
  }

  return resolvedPersonaIds.length > 0 ? resolvedPersonaIds : defaults;
}

function normalizeFeatureCard({
  value,
  fallback,
}: {
  value: unknown;
  fallback: LandingFeatureCard;
}): LandingFeatureCard {
  if (!isObjectRecord(value)) {
    return { ...fallback };
  }

  return {
    icon: normalizeText({ value: value.icon, fallback: fallback.icon }),
    title: normalizeText({ value: value.title, fallback: fallback.title }),
    description: normalizeText({
      value: value.description,
      fallback: fallback.description,
    }),
  };
}

function normalizeHowItWorksStep({
  value,
  fallback,
}: {
  value: unknown;
  fallback: LandingHowItWorksStep;
}): LandingHowItWorksStep {
  if (!isObjectRecord(value)) {
    return { ...fallback };
  }

  return {
    step: normalizeText({ value: value.step, fallback: fallback.step }),
    title: normalizeText({ value: value.title, fallback: fallback.title }),
    description: normalizeText({
      value: value.description,
      fallback: fallback.description,
    }),
  };
}

function normalizeWorkflowRhythmCard({
  value,
  fallback,
}: {
  value: unknown;
  fallback: LandingWorkflowRhythmCard;
}): LandingWorkflowRhythmCard {
  if (!isObjectRecord(value)) {
    return { ...fallback };
  }

  return {
    label: normalizeText({ value: value.label, fallback: fallback.label }),
    detail: normalizeText({ value: value.detail, fallback: fallback.detail }),
  };
}

function normalizeWorkflowCopy({
  value,
  fallback,
}: {
  value: unknown;
  fallback: LandingWorkflowCopy;
}): LandingWorkflowCopy {
  if (!isObjectRecord(value)) {
    return {
      ...fallback,
      rhythmCards: fallback.rhythmCards.map((card) => ({ ...card })),
    };
  }

  const rhythmCardsSource = Array.isArray(value.rhythmCards)
    ? value.rhythmCards
    : [];

  return {
    eyebrow: normalizeText({
      value: value.eyebrow,
      fallback: fallback.eyebrow,
    }),
    title: normalizeText({ value: value.title, fallback: fallback.title }),
    description: normalizeText({
      value: value.description,
      fallback: fallback.description,
    }),
    rhythmEyebrow: normalizeText({
      value: value.rhythmEyebrow,
      fallback: fallback.rhythmEyebrow,
    }),
    rhythmCards: fallback.rhythmCards.map((fallbackCard, index) =>
      normalizeWorkflowRhythmCard({
        value: rhythmCardsSource[index],
        fallback: fallbackCard,
      }),
    ),
  };
}

function normalizeLandingContent(value: unknown): LandingContent {
  const defaults = getDefaultLandingContent();

  if (!isObjectRecord(value)) {
    return defaults;
  }

  const featureCardsSource = Array.isArray(value.featureCards)
    ? value.featureCards
    : [];
  const howItWorksStepsSource = Array.isArray(value.howItWorksSteps)
    ? value.howItWorksSteps
    : [];

  return {
    featureCards: defaults.featureCards.map((fallbackCard, index) =>
      normalizeFeatureCard({
        value: featureCardsSource[index],
        fallback: fallbackCard,
      }),
    ),
    howItWorksSteps: defaults.howItWorksSteps.map((fallbackStep, index) =>
      normalizeHowItWorksStep({
        value: howItWorksStepsSource[index],
        fallback: fallbackStep,
      }),
    ),
    workflow: normalizeWorkflowCopy({
      value: value.workflow,
      fallback: defaults.workflow,
    }),
  };
}

function normalizeAboutContentSection({
  value,
  fallback,
}: {
  value: unknown;
  fallback: AboutContentSection;
}): AboutContentSection {
  if (!isObjectRecord(value)) {
    return {
      ...fallback,
      paragraphs: [...fallback.paragraphs],
    };
  }

  const paragraphsSource = Array.isArray(value.paragraphs)
    ? value.paragraphs
    : [];

  return {
    id: fallback.id,
    visualType: fallback.visualType,
    eyebrow: normalizeText({
      value: value.eyebrow,
      fallback: fallback.eyebrow,
    }),
    title: normalizeText({ value: value.title, fallback: fallback.title }),
    paragraphs: fallback.paragraphs.map((fallbackParagraph, index) =>
      normalizeText({
        value: paragraphsSource[index],
        fallback: fallbackParagraph,
      }),
    ),
  };
}

function normalizeAboutContent(value: unknown): AboutContent {
  const defaults = getDefaultAboutContent();

  if (!isObjectRecord(value)) {
    return defaults;
  }

  const sectionsSource = Array.isArray(value.sections) ? value.sections : [];
  const sectionSourceById = new Map<string, unknown>();

  for (const section of sectionsSource) {
    if (!isObjectRecord(section)) {
      continue;
    }

    if (typeof section.id !== "string") {
      continue;
    }

    sectionSourceById.set(section.id, section);
  }

  return {
    pageTitle: normalizeText({
      value: value.pageTitle,
      fallback: defaults.pageTitle,
    }),
    pageSubtitle: normalizeText({
      value: value.pageSubtitle,
      fallback: defaults.pageSubtitle,
    }),
    sections: defaults.sections.map((defaultSection) =>
      normalizeAboutContentSection({
        value: sectionSourceById.get(defaultSection.id),
        fallback: defaultSection,
      }),
    ),
    ctaTitle: normalizeText({
      value: value.ctaTitle,
      fallback: defaults.ctaTitle,
    }),
    ctaDescription: normalizeText({
      value: value.ctaDescription,
      fallback: defaults.ctaDescription,
    }),
    ctaPrimaryLabel: normalizeText({
      value: value.ctaPrimaryLabel,
      fallback: defaults.ctaPrimaryLabel,
    }),
    ctaSecondaryLabel: normalizeText({
      value: value.ctaSecondaryLabel,
      fallback: defaults.ctaSecondaryLabel,
    }),
  };
}

async function getSettingValues(keys: string[]): Promise<Map<string, unknown>> {
  await connectToDatabase();

  const settings = (await AppSetting.find({
    key: { $in: keys },
  })
    .select("key value")
    .lean()) as AppSettingRecord[];

  return new Map(settings.map((setting) => [setting.key, setting.value]));
}

export async function getEffectiveLandingPageContent(): Promise<LandingPageContent> {
  const heroFallback = getDefaultHeroContent();
  const landingFallback = getDefaultLandingContent();
  const homepageCopyFallback = getDefaultHomepageCopy();
  const featuredPersonaIdsFallback = getDefaultHomepageFeaturedPersonas();

  return getCachedConfigValue({
    key: "effective-landing-page-content",
    resolver: async () => {
      try {
        const settings = await getSettingValues([
          "admin.heroContent",
          "admin.landingContent",
          "admin.homepageCopy",
          "admin.homepageFeaturedPersonas",
        ]);

        return {
          heroContent: normalizeHeroContent(settings.get("admin.heroContent")),
          landingContent: normalizeLandingContent(
            settings.get("admin.landingContent"),
          ),
          homepageCopy: normalizeHomepageCopy(
            settings.get("admin.homepageCopy"),
          ),
          homepageFeaturedPersonaIds: normalizeHomepageFeaturedPersonaIds(
            settings.get("admin.homepageFeaturedPersonas"),
          ),
        };
      } catch {
        // Intentional fallback to defaults - admin config DB errors are non-fatal.
        return {
          heroContent: heroFallback,
          landingContent: landingFallback,
          homepageCopy: homepageCopyFallback,
          homepageFeaturedPersonaIds: featuredPersonaIdsFallback,
        };
      }
    },
  });
}

export async function getEffectiveAboutContent(): Promise<AboutContent> {
  const fallback = getDefaultAboutContent();

  return getCachedConfigValue({
    key: "effective-about-content",
    resolver: async () => {
      try {
        const settings = await getSettingValues(["admin.aboutContent"]);
        return normalizeAboutContent(settings.get("admin.aboutContent"));
      } catch {
        // Intentional fallback to defaults - admin config DB errors are non-fatal.
        return fallback;
      }
    },
  });
}
