import { PersonaId } from "@/types/PersonaData.d";

export interface HomepageCopy {
  ctaHeading: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  spotlightLabel: string;
  spotlightHeading: string;
  spotlightDescription: string;
}

const DEFAULT_HOMEPAGE_COPY: HomepageCopy = {
  ctaHeading:
    "Create an account, pick a persona, and let the conversation stay focused.",
  ctaDescription:
    "Explore the persona catalog first, or compare the plan limits if you already know how much capacity you need.",
  ctaPrimaryLabel: "Create account",
  ctaSecondaryLabel: "Explore plans",
  spotlightLabel: "Persona spotlight",
  spotlightHeading: "Different jobs need different voices.",
  spotlightDescription:
    "Droplet starts with purpose-built personas so planning, teaching, and creative work do not feel like the same assistant wearing a different label.",
};

const DEFAULT_HOMEPAGE_FEATURED_PERSONAS: PersonaId[] = [
  "strategist",
  "teacher",
  "creator",
];

export function getDefaultHomepageCopy(): HomepageCopy {
  return { ...DEFAULT_HOMEPAGE_COPY };
}

export function getDefaultHomepageFeaturedPersonas(): PersonaId[] {
  return [...DEFAULT_HOMEPAGE_FEATURED_PERSONAS];
}
