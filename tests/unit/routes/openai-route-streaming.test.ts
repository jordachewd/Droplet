import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration } from "@/app/api/openai/route";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  checkDailyConversationLimit,
  claimDailyConversationSlot,
} from "@/lib/utils/check-daily-conversations";
import {
  getTaskByIdForUser,
  incrementPromptCountIfBelowLimit,
} from "@/lib/utils/task-queries";
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
  updateTask: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/actions/user.actions", () => ({ getUserById: vi.fn() }));
vi.mock("@/lib/database/models/user.model", () => ({
  default: { findOneAndUpdate: vi.fn() },
}));
vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));
vi.mock("@/lib/utils/check-daily-conversations", () => ({
  checkDailyConversationLimit: vi.fn(),
  claimDailyConversationSlot: vi.fn(),
}));
vi.mock("@/lib/utils/task-queries", () => ({
  getTaskByIdForUser: vi.fn(),
  incrementPromptCountIfBelowLimit: vi.fn(),
}));
vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));
vi.mock("@/lib/utils/usage-event-utils", () => ({ emitUsageEvents: vi.fn() }));
vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
}));

const NEW_TASK_ID = "507f1f77bcf86cd799439012";
const STREAM_PROACTIVE_TIMEOUT_MESSAGE =
  "Your request is taking longer than expected. Media generation may still be processing in the background. Please check your library or start a new conversation.";

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
  let connectCallCount = 0;
  vi.mocked(connectToDatabase).mockImplementation(async () => {
    connectCallCount += 1;

    if (connectCallCount === 1) {
      return {} as Awaited<ReturnType<typeof connectToDatabase>>;
    }

    throw new Error("Mock settings database unavailable");
  });
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
    expect(maxDuration).toBe(60);
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
            content: [{ type: "text", text: "Media generated." }],
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

  it("sends a proactive timeout error event before the platform timeout kills the function", async () => {
    const timeoutCallbacks: Array<() => void> = [];
    const stderrWriteSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        timeoutCallbacks.push(callback as () => void);
      }

      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);
    vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => {
      return;
    });
    vi.mocked(generateStreamingResponse).mockImplementation(
      () => new Promise(() => undefined),
    );

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    expect(timeoutCallbacks).toHaveLength(1);
    timeoutCallbacks[0]?.();

    const payload = await response.text();
    const proactiveTimeoutLogged = stderrWriteSpy.mock.calls.some(([message]) =>
      String(message).includes(
        "[openai/route] proactive timeout safety net fired",
      ),
    );

    expect(payload).toContain('"type":"error"');
    expect(payload).toContain(STREAM_PROACTIVE_TIMEOUT_MESSAGE);
    expect(payload).not.toContain('"type":"final"');
    expect(proactiveTimeoutLogged).toBe(true);
  });

  it("clears the proactive timeout timer when streaming completes normally", async () => {
    const timeoutToken = 42 as unknown as ReturnType<typeof setTimeout>;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => 1_000);
    const clearTimeoutSpy = vi
      .spyOn(globalThis, "clearTimeout")
      .mockImplementation(() => {
        return;
      });
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((() => timeoutToken) as unknown as typeof setTimeout);

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    await response.text();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 55_000);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutToken);
    dateNowSpy.mockRestore();
  });

  it("uses remaining function budget when scheduling proactive timeout", async () => {
    const timeoutToken = 7 as unknown as ReturnType<typeof setTimeout>;
    const dateNowSpy = vi
      .spyOn(Date, "now")
      .mockImplementationOnce(() => 1_000)
      .mockImplementation(() => 8_000);
    const clearTimeoutSpy = vi
      .spyOn(globalThis, "clearTimeout")
      .mockImplementation(() => {
        return;
      });
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((() => timeoutToken) as unknown as typeof setTimeout);

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    await response.text();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 48_000);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutToken);
    dateNowSpy.mockRestore();
  });

  it("clamps proactive timeout delay at zero when setup time exceeds remaining budget", async () => {
    const timeoutToken = 9 as unknown as ReturnType<typeof setTimeout>;
    const dateNowSpy = vi
      .spyOn(Date, "now")
      .mockImplementationOnce(() => 1_000)
      .mockImplementation(() => 100_000);
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((() => timeoutToken) as unknown as typeof setTimeout);

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    await response.text();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
    dateNowSpy.mockRestore();
  });

  it("skips heartbeat writes after the stream controller is closed", async () => {
    const heartbeatCallbacks: Array<() => void> = [];
    const stderrWriteSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    vi.spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
    ) => {
      heartbeatCallbacks.push(callback);
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval);
    vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {
      return;
    });

    vi.mocked(generateStreamingResponse).mockImplementation(
      async ({ onMediaGenerationStart, onMediaGenerationEnd }) => {
        onMediaGenerationStart?.();
        onMediaGenerationEnd?.();

        return {
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Audio complete." }],
          },
          taskUsage: 12,
        };
      },
    );

    const response = await POST(
      buildOpenAiRequest(
        { messages: [{ role: "user", whois: "user", content: "new chat" }] },
        { Accept: "text/event-stream", "x-droplet-stream": "1" },
      ),
    );

    await response.text();

    for (const callback of heartbeatCallbacks) {
      callback();
    }

    const heartbeatWriteFailureLogged = stderrWriteSpy.mock.calls.some(
      ([message]) =>
        String(message).includes("[openai/route] heartbeat write failed"),
    );

    expect(heartbeatWriteFailureLogged).toBe(false);
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
