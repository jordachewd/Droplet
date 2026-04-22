import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
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

const EXISTING_TASK_ID = "507f1f77bcf86cd799439011";

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
    createTestTask({ _id: EXISTING_TASK_ID, estimatedBytes: 256 }),
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
  vi.mocked(createTask).mockResolvedValue({ _id: "507f1f77bcf86cd799439012" });
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

describe("POST /api/openai - media generation limits", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps conversation active when a plan media limit blocks generation", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValueOnce(null);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        const claimResult = await claimMediaGenerationSlot?.({
          limitType: "images",
        });
        if (!claimResult?.claimed) {
          return {
            blockedReason: "image_limit_reached",
            taskUsage: 5,
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [
                { type: "text", text: "Image generation limit reached." },
              ],
            },
          };
        }

        return {
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Image generated." }],
          },
          taskUsage: 5,
        };
      },
    );

    const response = await POST(
      buildOpenAiRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate image" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("image_limit_reached");
    expect(payload.endAction).toBe("start_new_conversation");
    expect(payload.taskStatus).toBe("active");
    expect(vi.mocked(updateTask).mock.calls.at(-1)?.[1]).not.toMatchObject({
      status: "ended",
    });
  });

  it("uses trial counters for limited personas and ends conversation on trial limit", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createTestTask({
        _id: EXISTING_TASK_ID,
        personaId: "teacher",
        estimatedBytes: 256,
      }),
    );
    vi.mocked(User.findOneAndUpdate).mockResolvedValueOnce(null);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        const claimResult = await claimMediaGenerationSlot?.({
          limitType: "images",
        });
        if (!claimResult?.claimed) {
          return {
            blockedReason: "image_limit_reached",
            taskUsage: 5,
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [{ type: "text", text: "Trial limit reached." }],
            },
          };
        }

        return { taskUsage: 5 };
      },
    );

    const response = await POST(
      buildOpenAiRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate image" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("trial_limit_reached");
    expect(payload.endAction).toBe("upgrade_plan");
  });

  it("claims image generation counters atomically", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      plan: {
        imageGenerations: 1,
      },
    });

    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        await claimMediaGenerationSlot?.({ limitType: "images" });
        return {
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Generated image output." }],
          },
          taskUsage: 10,
        };
      },
    );

    const response = await POST(
      buildOpenAiRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "create image" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      {
        clerkId: "user_123",
        "plan.imageGenerations": { $lt: 1 },
      },
      {
        $inc: {
          "plan.imageGenerations": 1,
        },
      },
      {
        new: true,
        strict: true,
        upsert: false,
      },
    );
  });

  it("rejects a second image claim attempt at the quota boundary", async () => {
    vi.mocked(User.findOneAndUpdate)
      .mockResolvedValueOnce({ plan: { imageGenerations: 3 } })
      .mockResolvedValueOnce(null);

    let secondClaimed = true;

    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        await claimMediaGenerationSlot?.({ limitType: "images" });
        const secondClaim = await claimMediaGenerationSlot?.({
          limitType: "images",
        });
        secondClaimed = Boolean(secondClaim?.claimed);

        return { taskUsage: 10 };
      },
    );

    const response = await POST(
      buildOpenAiRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "create image" }],
      }),
    );

    expect(response.status).toBe(500);
    expect(secondClaimed).toBe(false);
  });
});
