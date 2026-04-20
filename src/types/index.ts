export interface ContentItem {
  type: "text" | "temp" | "image_url" | "audio_url";
  text?: string | null | undefined;
  image_url?: { url: string | null };
  audio_url?: string | null;
}

export type MessageRole = "user" | "assistant" | "system" | "developer";

export interface Message {
  id?: string;
  whois?: MessageRole;
  role: MessageRole;
  content: ContentItem[] | string | null;
}

export interface Messages {
  taskId: string | null;
  personaId?: string | null;
  messages: Message[];
}
