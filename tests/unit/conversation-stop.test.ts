import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import {
  createTask,
  deleteTask,
  incrementPromptCountIfBelowLimit,
  updateTask,
} from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

vi.mock("@/lib/utils/openai/generateResponse", () => ({
  generateResponse: vi.fn(),
  generateStreamingResponse: vi.fn(),
}));

vi.mock("@/lib/utils/openai/generateTitle", () => ({
  generateTitle: vi.fn(),
}));

vi.mock("@/lib/actions/task.actions", () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
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
}));

vi.mock("@/lib/utils/task-queries", () => ({
  getTaskByIdForUser: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));

vi.mock("@/lib/utils/ensure-user-synced", () => ({
  ensureUserSynced: vi.fn(),
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
    estimatedBytes: 512,
    status: "active",
    updatedAt: "2026-03-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("conversation stop enforcement", () => {
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
    vi.mocked(ensureUserSynced).mockResolvedValue(null as never);
    vi.mocked(checkDailyConversationLimit).mockResolvedValue({
      allowed: true,
      limit: 5,
      used: 0,
      remaining: 5,
    });
    vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
      retryAfterMs: 0,
    });
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask() as never,
    );
    vi.mocked(generateTitle).mockResolvedValue(
      JSON.stringify({ title: "Generated title", usage: 7 }),
    );
    vi.mocked(createTask).mockResolvedValue({ _id: NEW_TASK_ID } as never);
    vi.mocked(incrementPromptCountIfBelowLimit).mockResolvedValue(true);
    vi.mocked(deleteTask).mockResolvedValue({ status: 200 } as never);
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
    vi.mocked(updateTask).mockResolvedValue({} as never);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets prompt_limit_reached with start_new_conversation when prompt count equals plan limit", async () => {
    vi.mocked(incrementPromptCountIfBelowLimit).mockResolvedValue(false);
    vi.mocked(checkDailyConversationLimit).mockResolvedValue({
      allowed: true,
      limit: 5,
      used: 2,
      remaining: 3,
    });

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("prompt_limit_reached");
    expect(payload.endAction).toBe("start_new_conversation");
    expect(incrementPromptCountIfBelowLimit).toHaveBeenCalledWith({
      taskId: EXISTING_TASK_ID,
      limit: 10,
    });
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "prompt_limit_reached",
        endAction: "start_new_conversation",
      }),
    );
  });

  it("sets daily_conversation_limit_reached with upgrade_plan when daily count equals limit", async () => {
    vi.mocked(checkDailyConversationLimit).mockResolvedValue({
      allowed: false,
      limit: 5,
      used: 5,
      remaining: 0,
    });

    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("daily_conversation_limit_reached");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(createTask).toHaveBeenCalledOnce();
    expect(deleteTask).toHaveBeenCalledWith(NEW_TASK_ID);
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("sets conversation_storage_limit_reached with start_new_conversation at the 12MB threshold", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "x".repeat(12 * 1024 * 1024) }],
        },
        taskUsage: 9,
      }),
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("conversation_storage_limit_reached");
    expect(payload.endAction).toBe("start_new_conversation");
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "conversation_storage_limit_reached",
        endAction: "start_new_conversation",
      }),
    );
  });

  it("sets media_limit_reached when image usage equals the Lite quota", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 3,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "media_limit_reached",
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Image limit reached." }],
        },
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
    expect(payload.endAction).toBe("upgrade_plan");
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          imageLimitReached: true,
          supportsImageGeneration: false,
        }),
      }),
    );
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "media_limit_reached",
        endAction: "upgrade_plan",
      }),
    );
  });

  it("sets media_limit_reached when audio usage equals the Pro quota", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 50,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "media_limit_reached",
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Audio limit reached." }],
        },
      }),
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate audio" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("media_limit_reached");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          audioLimitReached: true,
          supportsAudioGeneration: false,
        }),
      }),
    );
  });

  it("sets billing_state_invalid with upgrade_plan when paid plan expires", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() - 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("billing_state_invalid");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "billing_state_invalid",
        endAction: "upgrade_plan",
      }),
    );
  });

  it("bypasses finite-limit stop checks for Premium unlimited limits", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Premium",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 10_000,
        audioGenerations: 10_000,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask({
        promptCount: 5_000,
      }) as never,
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.stopReason).toBeUndefined();
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        planName: "Premium",
        entitlements: expect.objectContaining({
          imageLimitReached: false,
          audioLimitReached: false,
          supportsImageGeneration: true,
          supportsAudioGeneration: true,
        }),
      }),
    );
    expect(updateTask).not.toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
      }),
    );
  });
});
