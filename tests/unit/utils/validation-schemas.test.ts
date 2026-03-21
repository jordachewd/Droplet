import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  chatMessageSchema,
  chatMessageArraySchema,
  nonEmptyStringSchema,
  messageTextContentSchema,
} from "@/lib/utils/validation-schemas";

const openAiRequestBodySchema = z
  .object({
    messages: chatMessageArraySchema.min(1),
    taskId: nonEmptyStringSchema.nullable().optional(),
    personaId: nonEmptyStringSchema.nullable().optional(),
  })
  .strict();

describe("openAiRequestBodySchema", () => {
  const validMessage = {
    role: "user" as const,
    whois: "user" as const,
    content: [{ type: "text" as const, text: "Hello" }],
  };

  it("accepts valid request with null taskId (new conversation)", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      taskId: null,
      personaId: "strategist",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request with string taskId (existing conversation)", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      taskId: "507f1f77bcf86cd799439011",
      personaId: "developer",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request with undefined taskId (omitted)", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      personaId: "teacher",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty taskId string", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      taskId: "",
      personaId: "strategist",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only taskId", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      taskId: "   ",
      personaId: "strategist",
    });
    expect(result.success).toBe(false);
  });

  it("rejects request with empty messages array", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [],
      personaId: "strategist",
    });
    expect(result.success).toBe(false);
  });

  it("rejects request with extra properties (strict mode)", () => {
    const result = openAiRequestBodySchema.safeParse({
      messages: [validMessage],
      personaId: "strategist",
      extraField: "should fail",
    });
    expect(result.success).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("accepts message with content array", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
      whois: "user",
      content: [{ type: "text", text: "Hello" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with string content", () => {
    const result = chatMessageSchema.safeParse({
      role: "assistant",
      content: "Hello there",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with null content", () => {
    const result = chatMessageSchema.safeParse({
      role: "assistant",
      content: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with extra properties (passthrough mode)", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
      content: "Hello",
      unknownField: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("messageTextContentSchema", () => {
  it("accepts image_url content item", () => {
    const result = messageTextContentSchema.safeParse({
      type: "image_url",
      image_url: { url: "https://example.com/img.png" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts audio_url content item", () => {
    const result = messageTextContentSchema.safeParse({
      type: "audio_url",
      audio_url: "https://example.com/audio.mp3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects content item with extra properties (strict mode)", () => {
    const result = messageTextContentSchema.safeParse({
      type: "text",
      text: "Hello",
      extraProp: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts potential XSS payloads as plain text values", () => {
    const result = messageTextContentSchema.safeParse({
      type: "text",
      text: `<img src=x onerror="alert('xss')"><script>alert('xss')</script>`,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toContain("<script>");
    }
  });

  it("accepts very long string payloads", () => {
    const result = messageTextContentSchema.safeParse({
      type: "text",
      text: "a".repeat(100_000),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text?.length).toBe(100_000);
    }
  });

  it("accepts null bytes in text payloads without crashing", () => {
    const result = messageTextContentSchema.safeParse({
      type: "text",
      text: "hello\u0000world",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe("hello\u0000world");
    }
  });
});
