import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
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

vi.mock("@/lib/utils/openai/generateTitle", () => ({
  generateTitle: vi.fn(),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  createTask: vi.fn(),
  incrementPromptCountIfBelowLimit: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/actions/user.actions", () => ({
  getUserById: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/utils/check-daily-conversations", () => ({
  checkDailyConversationLimit: vi.fn(),
  claimDailyConversationSlot: vi.fn(),
}));

vi.mock("@/lib/utils/task-queries", () => ({
  getTaskByIdForUser: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));

vi.mock("@/lib/utils/usage-event-utils", () => ({
  emitUsageEvents: vi.fn(),
}));

vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
}));

const EXISTING_TASK_ID = "507f1f77bcf86cd799439011";
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

function createExistingTask() {
  return createTestTask({
    _id: EXISTING_TASK_ID,
    estimatedBytes: 256,
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

  vi.mocked(getTaskByIdForUser).mockResolvedValue(createExistingTask());

  vi.mocked(generateTitle).mockResolvedValue(
    JSON.stringify({
      title: "Generated title",
      usage: 7,
    }),
  );

  vi.mocked(createTask).mockResolvedValue({ _id: NEW_TASK_ID });
  vi.mocked(incrementPromptCountIfBelowLimit).mockResolvedValue(true);

  vi.mocked(generateResponse).mockResolvedValue(
    JSON.stringify({
      taskData: {
        whois: "assistant",
        role: "assistant",
        content: [{ type: "text", text: "Hello from AI" }],
      },
      taskUsage: 11,
      generatedImage: false,
      generatedAudio: false,
    }),
  );

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

describe("POST /api/openai - auth and validation", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth(vi.mocked(auth), {
      userId: null,
      isAuthenticated: false,
      sessionId: null,
    });

    const response = await POST(
      buildOpenAiRequest({
        messages: [{ role: "user", whois: "user", content: "hello" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Authentication required");
  });

  it("returns 400 when request body parsing fails", async () => {
    const malformedRequest = {
      headers: new Headers(),
      signal: new AbortController().signal,
      json: vi.fn().mockRejectedValue(new Error("Malformed JSON")),
    } as unknown as Request;

    const response = await POST(malformedRequest);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid request body.");
  });

  it("returns 400 when body schema validation fails", async () => {
    const response = await POST(
      buildOpenAiRequest({
        messages: [],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid request body.");
  });

  it("returns 400 when latest message is not from user", async () => {
    const response = await POST(
      buildOpenAiRequest({
        messages: [
          {
            role: "assistant",
            whois: "assistant",
            content: [{ type: "text", text: "hello" }],
          },
        ],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("A user message is required");
  });

  it("returns 404 when provided task is not found for the user", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(null);

    const response = await POST(
      buildOpenAiRequest({
        taskId: "task_missing",
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toContain("Conversation not found");
  });

  it("returns 503 when user self-heal fails", async () => {
    vi.mocked(getUserById).mockResolvedValue(null);
    vi.mocked(ensureUserSynced).mockResolvedValue(null);

    const response = await POST(
      buildOpenAiRequest({
        messages: [{ role: "user", whois: "user", content: "hello" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Account not yet provisioned");
    expect(ensureUserSynced).toHaveBeenCalledWith("user_123");
  });

  it("continues request handling when user self-heal succeeds", async () => {
    vi.mocked(getUserById).mockResolvedValue(null);
    vi.mocked(ensureUserSynced).mockResolvedValue({
      ...createTestUser({
        clerkId: "user_123",
        role: "client",
        plan: {
          name: "Pro",
          expiresOn: new Date(Date.now() + 86_400_000),
        },
      }),
    });

    const response = await POST(
      buildOpenAiRequest({
        messages: [{ role: "user", whois: "user", content: "hello" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.taskId).toBe(NEW_TASK_ID);
    expect(ensureUserSynced).toHaveBeenCalledWith("user_123");
  });
});
