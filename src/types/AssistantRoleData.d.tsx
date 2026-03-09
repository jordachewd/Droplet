export type AssistantRoleCategory =
  | "Productivity"
  | "Learning"
  | "Creative"
  | "Companion";

export type AssistantRoleId =
  | "strategist"
  | "teacher"
  | "developer"
  | "creator"
  | "best-friend"
  | "boyfriend"
  | "girlfriend";

export interface AssistantRole {
  id: AssistantRoleId;
  label: string;
  tagline: string;
  description: string;
  category: AssistantRoleCategory;
  icon: string;
  starterPrompts: string[];
  systemPrompt: string;
  supportsImage: boolean;
  supportsAudio: boolean;
}

export interface ConversationListItem {
  id: string;
  title: string;
  assistantRoleId: AssistantRoleId;
  updatedAtLabel: string;
  href: string;
  isDemo?: boolean;
}
