import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
import {
  generateResponse,
  generateStreamingResponse,
} from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { emitUsageEvents } from "@/lib/utils/usage-event-utils";

vi.mock("@/lib/utils/openai/generateResponse", () => ({
  generateResponse: vi.fn(),
  generateStreamingResponse: vi.fn(),
}));

vi.mock("@/lib/utils/openai/generateTitle", () => ({
  generateTitle: vi.fn(),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  createTask: vi.fn(),
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
}));

vi.mock("@/lib/utils/task-queries", () => ({
  getTaskByIdForUser: vi.fn(),
}));

vi.mock("@/lib/utils/usage-event-utils", () => ({
  emitUsageEvents: vi.fn(),
}));

const EXISTING_TASK_ID = "507f1f77bcf86cd799439011";
const NEW_TASK_ID = "507f1f77bcf86cd799439012";

function buildRequest(payload: unknown): Request {
  return new Request("http://localhost:3000/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function createExistingTask(overrides: Record<string, unknown> = {}) {
  return {
    _id: EXISTING_TASK_ID,
    title: "Conversation",
    personaId: "teacher",
    messages: [
      {
        role: "user",
        whois: "user",
        content: [{ type: "text", text: "Earlier prompt" }],
      },
    ],
    usage: 3,
    promptCount: 1,
    mediaCount: 0,
    estimatedBytes: 256,
    status: "active",
    updatedAt: "2026-03-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("POST /api/openai phase16", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(checkDailyConversationLimit).mockResolvedValue({
      allowed: true,
      limit: 5,
      used: 0,
      remaining: 5,
    });
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask() as never,
    );
    vi.mocked(generateTitle).mockResolvedValue(
      JSON.stringify({
        title: "Generated title",
        usage: 7,
        requestMetric: {
          requestType: "title",
          model: "gpt-4.1-nano",
          tokensIn: 5,
          tokensOut: 2,
          latencyMs: 12,
        },
      }),
    );
    vi.mocked(createTask).mockResolvedValue({ _id: NEW_TASK_ID } as never);
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
        requestMetrics: [
          {
            requestType: "chat",
            model: "gpt-4o-mini",
            tokensIn: 8,
            tokensOut: 3,
            latencyMs: 24,
          },
        ],
      }),
    );
    vi.mocked(generateStreamingResponse).mockResolvedValue({
      taskData: {
        whois: "assistant",
        role: "assistant",
        content: [{ type: "text", text: "Hello from AI" }],
      },
      taskUsage: 11,
      generatedImage: false,
      generatedAudio: false,
      requestMetrics: [
        {
          requestType: "chat",
          model: "gpt-4o-mini",
          tokensIn: 8,
          tokensOut: 3,
          latencyMs: 24,
        },
      ],
    } as never);
    vi.mocked(updateTask).mockResolvedValue({} as never);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a new task, passes plan-aware models, and emits usage events", async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(generateTitle).toHaveBeenCalledWith(
      [{ role: "user", whois: "user", content: "new chat" }],
      "Lite",
      "strategist",
    );
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", whois: "user", content: "new chat" }],
        taskId: NEW_TASK_ID,
        userId: "user_123",
        personaId: "strategist",
        planName: "Lite",
        taskClass: "standard",
        budgetState: "normal",
        entitlements: expect.objectContaining({
          planName: "Lite",
          supportsAudioGeneration: false,
        }),
      }),
    );
    expect(emitUsageEvents).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "user_123",
        taskId: NEW_TASK_ID,
        personaId: "strategist",
        metrics: [expect.objectContaining({ requestType: "title" })],
      }),
    );
    expect(emitUsageEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: "user_123",
        taskId: NEW_TASK_ID,
        personaId: "strategist",
        metrics: [expect.objectContaining({ requestType: "chat" })],
      }),
    );
    expect(payload.taskId).toBe(NEW_TASK_ID);
    expect(payload.personaId).toBe("strategist");
  });

  it("returns a structured billing stop payload for expired paid plans", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() - 86_400_000),
      },
    } as never);

    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "hi" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("billing_state_invalid");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(payload.acceptedPrompt).toBe(false);
    expect(generateTitle).not.toHaveBeenCalled();
    expect(generateResponse).not.toHaveBeenCalled();
    expect(emitUsageEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        metrics: [
          expect.objectContaining({
            blocked: true,
            blockedReason: "billing_state_invalid",
          }),
        ],
      }),
    );
  });

  it("ends the conversation when media generation is blocked by plan limits", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "media_limit_reached",
        taskUsage: 5,
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Image generation limit reached for your current plan.",
            },
          ],
        },
        requestMetrics: [
          {
            requestType: "chat",
            model: "gpt-4o-mini",
            latencyMs: 10,
          },
          {
            requestType: "image",
            model: "gpt-image-1-mini",
            blocked: true,
            blockedReason: "media_limit_reached",
            latencyMs: 0,
          },
        ],
      }),
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate image" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("media_limit_reached");
    expect(payload.acceptedPrompt).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "media_limit_reached",
        endAction: "upgrade_plan",
      }),
    );
    expect(emitUsageEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        taskId: EXISTING_TASK_ID,
        metrics: expect.arrayContaining([
          expect.objectContaining({ requestType: "chat" }),
          expect.objectContaining({
            requestType: "image",
            blockedReason: "media_limit_reached",
          }),
        ]),
      }),
    );
  });
});
