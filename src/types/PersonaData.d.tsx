export type PersonaCategory =
  | "Productivity"
  | "Learning"
  | "Creative"
  | "Lifestyle"
  | "Career";

export type PersonaId =
  | "strategist"
  | "teacher"
  | "developer"
  | "creator"
  | "wellness"
  | "interviewer";

export type PersonaAccessLevel = "full" | "limited" | "blocked";

export interface Persona {
  id: PersonaId;
  label: string;
  tagline: string;
  description: string;
  category: PersonaCategory;
  icon: string;
  heroImage: string;
  starterPrompts: string[];
  systemPrompt: string;
  supportsImage: boolean;
  supportsAudio: boolean;
}

export interface ConversationListItem {
  id: string;
  title: string;
  personaId: PersonaId;
  updatedAtLabel: string;
  href: string;
  isDemo?: boolean;
}
