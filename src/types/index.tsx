export interface ContentItem {
  type: "text" | "temp" | "image_url" | "audio_url";
  text?: string | null | undefined;
  image_url?: { url: string | null };
  audio_url?: string | null;
}

export type MessageRole = "user" | "assistant" | "system" | "developer";

export interface Message {
  whois?: MessageRole;
  role: MessageRole;
  content: ContentItem[] | string | null;
}

export interface Messages {
  taskId: string | null;
  personaId?: string | null;
  messages: Message[];
}

type ChipOptions = {
  id: number;
  label: string;
};

export type Chip = {
  id: number;
  label: string;
  icon: string;
  options: ChipOptions[];
};
