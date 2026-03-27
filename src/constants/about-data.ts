import type { FullPersonaAccessByPlan } from "@/lib/utils/effective-persona-access";

export type AboutVisualType =
  | "identity"
  | "workflow"
  | "personas"
  | "media"
  | "plans";

export type AboutSectionId =
  | "identity"
  | "workflow"
  | "personas"
  | "media"
  | "plans";

export interface AboutSection {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  visualType: AboutVisualType;
}

export interface AboutContentSection {
  id: AboutSectionId;
  visualType: AboutVisualType;
  eyebrow: string;
  title: string;
  paragraphs: string[];
}

export interface AboutContent {
  pageTitle: string;
  pageSubtitle: string;
  sections: AboutContentSection[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
}

const PERSONA_ACCESS_SUMMARY_TOKEN = "{{persona_access_summary}}";

function formatPersonaList({
  personaIds,
  personaLabelById,
}: {
  personaIds: string[];
  personaLabelById: Record<string, string>;
}): string {
  const labels = personaIds
    .map((personaId) => personaLabelById[personaId])
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return "no personas";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function buildPersonaAccessSummary(
  personaAccessByPlan: FullPersonaAccessByPlan,
  personaLabelById: Record<string, string>,
): string {
  return `Lite includes ${formatPersonaList({ personaIds: personaAccessByPlan.Lite, personaLabelById })}. Pro includes ${formatPersonaList({ personaIds: personaAccessByPlan.Pro, personaLabelById })}. Premium includes ${formatPersonaList({ personaIds: personaAccessByPlan.Premium, personaLabelById })}.`;
}

const ABOUT_CONTENT_DEFAULTS: AboutContent = {
  pageTitle: "About Droplet",
  pageSubtitle:
    "A persona-driven AI assistant built for structured conversations, practical output, and media-aware workflows.",
  sections: [
    {
      id: "identity",
      visualType: "identity",
      eyebrow: "Persona-led guidance",
      title: "Droplet is an AI workspace shaped by specialist personas.",
      paragraphs: [
        "Each conversation starts with a persona that sets the assistant's tone, boundaries, and style of help. Instead of a generic chatbot, you begin with a role that already knows how to think about planning, learning, creative work, analysis, or career preparation.",
        "That structure keeps the product grounded: the Strategist plans and analyzes, the Teacher explains, the Developer debugs, the Creator ideates, and the Wellness persona supports healthy routines.",
      ],
    },
    {
      id: "workflow",
      visualType: "workflow",
      eyebrow: "How the flow works",
      title:
        "Pick a persona, start a conversation, and keep momentum in one place.",
      paragraphs: [
        "Droplet is built around account-based conversations. You choose a persona, send a prompt, and continue the thread with saved context instead of starting over every time.",
        "The app keeps each conversation tied to the persona you selected, so follow-up prompts stay coherent and the conversation history remains easy to revisit from your library.",
      ],
    },
    {
      id: "personas",
      visualType: "personas",
      eyebrow: "Six personas",
      title: "Persona access scales by plan tier.",
      paragraphs: [
        PERSONA_ACCESS_SUMMARY_TOKEN,
        "The current catalog covers Productivity, Learning, Creative, Lifestyle, and Career use cases so users can move between practical execution, reflection, and content work without switching products.",
      ],
    },
    {
      id: "media",
      visualType: "media",
      eyebrow: "Media workflows",
      title:
        "Text is the core experience, with media tools layered in where they help.",
      paragraphs: [
        "Droplet supports text conversations first, then extends into media workflows such as image and audio generation when the selected persona and the user's plan allow it.",
        "Premium is the top-tier plan for the most advanced media workflows, including the plan area reserved for video generation, while Lite and Pro keep the focus on day-to-day chat plus capped media usage.",
      ],
    },
    {
      id: "plans",
      visualType: "plans",
      eyebrow: "Plans and limits",
      title:
        "Choose the limits that match how often you want to rely on Droplet.",
      paragraphs: [
        "New accounts start on Lite, which is free forever and designed for everyday testing, light productivity, and occasional media use. Pro and Premium increase conversation capacity, prompt limits, and media headroom.",
        "If you want the full plan breakdown, pricing, and current entitlements, the plans page is the canonical public reference.",
      ],
    },
  ],
  ctaTitle: "Want the full breakdown of pricing and plan limits?",
  ctaDescription:
    "Compare Lite, Pro, and Premium on the public plans page, or jump straight into the persona catalog before creating an account.",
  ctaPrimaryLabel: "View plans",
  ctaSecondaryLabel: "Explore personas",
};

function cloneAboutSection(section: AboutContentSection): AboutContentSection {
  return {
    ...section,
    paragraphs: [...section.paragraphs],
  };
}

export function getDefaultAboutContent(): AboutContent {
  return {
    ...ABOUT_CONTENT_DEFAULTS,
    sections: ABOUT_CONTENT_DEFAULTS.sections.map(cloneAboutSection),
  };
}

function resolveAboutParagraph(
  paragraph: string,
  personaAccessSummary: string,
): string {
  return paragraph
    .split(PERSONA_ACCESS_SUMMARY_TOKEN)
    .join(personaAccessSummary);
}

export function buildAboutSections({
  personaAccessSummary,
  content = getDefaultAboutContent(),
}: {
  personaAccessSummary: string;
  content?: AboutContent;
}): AboutSection[] {
  const defaultContent = getDefaultAboutContent();
  const sourceSections =
    content.sections.length > 0 ? content.sections : defaultContent.sections;

  return sourceSections.map((section) => ({
    eyebrow: section.eyebrow,
    title: section.title,
    paragraphs: section.paragraphs.map((paragraph) =>
      resolveAboutParagraph(paragraph, personaAccessSummary),
    ),
    visualType: section.visualType,
  }));
}
