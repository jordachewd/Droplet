import "server-only";

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

export const chatMessageSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    role: z.enum(["user", "assistant", "system", "developer"]),
    whois: z.enum(["user", "assistant", "system", "developer"]).optional(),
    content: z.union([z.string(), z.array(messageTextContentSchema), z.null()]),
  })
  .passthrough();

export const chatMessageArraySchema = z.array(chatMessageSchema);

export const nonEmptyStringSchema = z.string().trim().min(1);
