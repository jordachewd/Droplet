import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration } from "@/app/api/openai/route";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import {
  createTask,
  incrementPromptCountIfBelowLimit,
  updateTask,
} from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";
import {
  checkDailyConversationLimit,
  claimDailyConversationSlot,
} from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { emitUsageEvents } from "@/lib/utils/usage-event-utils";
import {
  buildMockRequest,
  createTestTask,
  createTestUser,
  mockAuth,
} from "../test-support";

vi.mock("@/lib/utils/openai/generateResponse", () => ({
  generateResponse: vi.fn(),
  generateStreamingResponse: vi.fn(),
}));
vi.mock("@/lib/utils/openai/generateTitle", () => ({ generateTitle: vi.fn() }));
vi.mock("@/lib/actions/task.actions", () => ({
  createTask: vi.fn(),
  incrementPromptCountIfBelowLimit: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/actions/user.actions", () => ({ getUserById: vi.fn() }));
vi.mock("@/lib/database/models/user.model", () => ({
  default: { findOneAndUpdate: vi.fn() },
}));
vi.mock("@/lib/utils/check-daily-conversations", () => ({
  checkDailyConversationLimit: vi.fn(),
  claimDailyConversationSlot: vi.fn(),
}));
vi.mock("@/lib/utils/task-queries", () => ({ getTaskByIdForUser: vi.fn() }));
vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));
vi.mock("@/lib/utils/usage-event-utils", () => ({ emitUsageEvents: vi.fn() }));
vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
}));

const NEW_TASK_ID = "507f1f77bcf86cd799439012";

function buildOpenAiRequest(
  payload: unknown,
  headers: Record<string, string> = {},
): Request {
  return buildMockRequest({
    payload,
    headers,
    url: "http://localhost:3000/api/openai",
  });
}

function setupDefaultMocks() {
  vi.clearAllMocks();
  mockAuth(vi.mocked(auth), {
    userId: "user_123",
    isAuthenticated: true,
    sessionId: "session_123",
  });
  vi.mocked(getUserById).mockResolvedValue(
    createTestUser({
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        videoGenerations: 0,
        usagePeriodStart: new Date(),
      },
    }),
  );
  vi.mocked(checkDailyConversationLimit).mockResolvedValue({
    allowed: true,
    limit: 5,
    used: 0,
    remaining: 5,
  });
  vi.mocked(claimDailyConversationSlot).mockResolvedValue({
    claimed: true,
    limit: 5,
    used: 1,
    remaining: 4,
  });
  vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
    success: true,
    limit: 20,
    remaining: 19,
    resetAt: Date.now() + 60_000,
    retryAfterMs: 0,
  });
  vi.mocked(getTaskByIdForUser).mockResolvedValue(
    createTestTask({ _id: "507f1f77bcf86cd799439011", estimatedBytes: 256 }),
  );
  vi.mocked(generateTitle).mockResolvedValue({
    title: "Generated title",
    usage: 7,
    model: "gpt-4.1-nano",
    requestMetric: {
      requestType: "title",
      model: "gpt-4.1-nano",
      latencyMs: 5,
    },
  });
  vi.mocked(createTask).mockResolvedValue({ _id: NEW_TASK_ID });
  vi.mocked(incrementPromptCountIfBelowLimit).mockResolvedValue(true);
  vi.mocked(generateResponse).mockResolvedValue({
    taskData: {
      whois: "assistant",
      role: "assistant",
      content: [{ type: "text", text: "Hello from AI" }],
    },
    taskUsage: 11,
  });
  vi.mocked(generateStreamingResponse).mockResolvedValue({
    taskData: {
      whois: "assistant",
      role: "assistant",
      content: [{ type: "text", text: "Hello from AI" }],
    },
    taskUsage: 11,
  });
  vi.mocked(updateTask).mockResolvedValue({});
  vi.mocked(User.findOneAndUpdate).mockResolvedValue({});
  vi.mocked(ensureUserSynced).mockResolvedValue(null);
  vi.mocked(emitUsageEvents).mockImplementation(() => {
    return;
  });
}

describe("POST /api/openai - streaming", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports maxDuration for long-running stream requests", () => {
    expect(maxDuration).toBe(300);
  });

  it("streams meta, chunk, and final events when streaming is requested", async () => {
    vi.mocked(generateStreamingResponse).mockImplementation(
      async ({ onContentChunk }) => {
        onContentChunk?.("Hello", "Hello");
        return {
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Hello from AI" }],
          },
          taskUsage: 11,
        };
      },
    );

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    const payload = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    expect(generateResponse).not.toHaveBeenCalled();
    expect(payload).toContain('"type":"meta"');
    expect(payload).toContain('"type":"chunk"');
    expect(payload).toContain('"snapshot":"Hello"');
    expect(payload).toContain('"type":"final"');
  });

  it("emits heartbeat events while media generation is active", async () => {
    vi.mocked(generateStreamingResponse).mockImplementation(
      async ({ onMediaGenerationStart, onMediaGenerationEnd }) => {
        onMediaGenerationStart?.();
        onMediaGenerationEnd?.();

        return {
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Video generated." }],
          },
          taskUsage: 14,
        };
      },
    );

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"type":"heartbeat"');
    expect(payload).toContain('"type":"final"');
  });

  it("emits an SSE error event when streaming generation returns an OpenAI error", async () => {
    vi.mocked(generateStreamingResponse).mockResolvedValue({
      errorType: "rate_limit",
    });

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"type":"error"');
    expect(payload).not.toContain('"type":"final"');
  });

  it("emits a generic SSE error when streaming generation throws", async () => {
    vi.mocked(generateStreamingResponse).mockRejectedValue(
      new Error("streaming provider unavailable"),
    );

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"type":"error"');
    expect(payload).toContain(
      "An error occurred while processing your request.",
    );
  });
});
