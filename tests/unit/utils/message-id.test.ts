import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureMessageHasId,
  ensureMessagesHaveId,
} from "@/lib/utils/message-id";
import { createTestTask } from "../test-support";

describe("message-id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps existing message ids", () => {
    const message = createTestTask().messages[0];
    const withId = {
      ...message,
      id: "existing_id",
    };

    expect(ensureMessageHasId(withId).id).toBe("existing_id");
  });

  it("adds an id using crypto.randomUUID when missing", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid_generated"),
    });

    const message = {
      ...createTestTask().messages[0],
      id: "",
    };

    expect(ensureMessageHasId(message).id).toBe("uuid_generated");
  });

  it("adds ids to all messages that miss them", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("id_1")
        .mockReturnValueOnce("id_2"),
    });

    const task = createTestTask();
    const messages = [
      { ...task.messages[0], id: "" },
      {
        role: "assistant" as const,
        whois: "assistant" as const,
        content: [{ type: "text" as const, text: "response" }],
      },
    ];

    const result = ensureMessagesHaveId(messages);

    expect(result[0]?.id).toBe("id_1");
    expect(result[1]?.id).toBe("id_2");
  });
});
