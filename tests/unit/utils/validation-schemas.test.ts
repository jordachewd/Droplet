import { describe, expect, it } from "vitest";
import {
  chatMessageArraySchema,
  chatMessageSchema,
  messageTextContentSchema,
  nonEmptyStringSchema,
} from "@/lib/utils/validation-schemas";
import { createTestTask } from "../test-support";

describe("validation-schemas", () => {
  it("accepts valid chat messages", () => {
    const task = createTestTask();
    const parsed = chatMessageSchema.safeParse(task.messages[0]);

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid message content item keys", () => {
    const parsed = messageTextContentSchema.safeParse({
      type: "text",
      text: "hello",
      extra: "not-allowed",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates message arrays and non-empty strings", () => {
    const task = createTestTask();
    const arrayParsed = chatMessageArraySchema.safeParse(task.messages);

    expect(arrayParsed.success).toBe(true);
    expect(nonEmptyStringSchema.safeParse("   ")).toEqual(
      expect.objectContaining({ success: false }),
    );
    expect(nonEmptyStringSchema.safeParse("ok")).toEqual(
      expect.objectContaining({ success: true }),
    );
  });
});
