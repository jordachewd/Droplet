import { z } from "zod";

export const messageTextContentSchema = z
  .object({
    type: z.enum(["text", "temp", "image_url", "audio_url"]),
    text: z.string().nullable().optional(),
    image_url: z
      .object({
        url: z.string().nullable(),
      })
      .optional(),
    audio_url: z.string().nullable().optional(),
  })
  .strict();
export const messageContentItemSchema = messageTextContentSchema;

export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system", "developer"]),
    whois: z.enum(["user", "assistant", "system", "developer"]).optional(),
    content: z.union([z.string(), z.array(messageContentItemSchema), z.null()]),
  })
  .strict();

export const chatMessageArraySchema = z.array(chatMessageSchema);

export const nonEmptyStringSchema = z.string().trim().min(1);

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
