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
import { PLAN_LIMITS } from "@/constants/plans";
import * as aiModelPolicy from "@/lib/utils/ai-model-policy";
import * as usageLimitUtils from "@/lib/utils/check-usage-limit";
import * as entitlementsUtils from "@/lib/utils/resolve-entitlements";
import {
  buildMockRequest,
  createTestTask,
  createTestUser,
} from "../test-support/factories";

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

function buildRequest(
  payload: unknown,
  headers: Record<string, string> = {},
): Request {
  return buildMockRequest({
    payload,
    headers,
  });
}

function createExistingTask(overrides: Record<string, unknown> = {}) {
  return createTestTask({
    _id: EXISTING_TASK_ID,
    estimatedBytes: 256,
    ...overrides,
  });
}

describe("POST /api/openai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
    vi.mocked(getUserById).mockResolvedValue(
      createTestUser({
        plan: {
          name: "Lite",
          expiresOn: new Date(Date.now() + 86_400_000),
          imageGenerations: 0,
          audioGenerations: 0,
          usagePeriodStart: new Date(),
        },
      }) as never,
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

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "hi" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Authentication required.");
  });

  it("returns 400 when the latest message is not a user prompt", async () => {
    const response = await POST(
      buildRequest({
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
    expect(payload.error).toContain("user message is required");
  });

  it("returns 403 when user plan has expired", async () => {
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
    expect(payload.error).toContain("expired");
  });

  it("allows limited personas on Lite plan as trial access", async () => {
    const response = await POST(
      buildRequest({
        personaId: "teacher",
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.personaId).toBe("teacher");
    expect(generateTitle).toHaveBeenCalledOnce();
    expect(generateResponse).toHaveBeenCalledOnce();
  });

  it("bypasses persona and quota restrictions for admin role users", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      role: "admin",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() - 86_400_000),
        imageGenerations: 999,
        audioGenerations: 999,
        videoGenerations: 999,
        usagePeriodStart: new Date(),
      },
    } as never);

    const response = await POST(
      buildRequest({
        personaId: "interviewer",
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.personaId).toBe("interviewer");
    expect(claimDailyConversationSlot).not.toHaveBeenCalled();
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "interviewer",
        entitlements: expect.objectContaining({
          supportsImageGeneration: true,
          supportsAudioGeneration: true,
          supportsVideoGeneration: true,
          allowedPersonaIds: expect.arrayContaining([
            "strategist",
            "teacher",
            "developer",
            "creator",
            "wellness",
            "interviewer",
          ]),
        }),
      }),
    );
  });

  it("keeps video support enabled in entitlements when video limit is reached", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        videoGenerations: 1,
        usagePeriodStart: new Date(),
      },
    } as never);

    await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );

    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          supportsVideoGeneration: true,
          videoLimitReached: true,
        }),
      }),
    );
  });

  it("creates a new task when no taskId is provided", async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(claimDailyConversationSlot).toHaveBeenCalledWith(
      "user_123",
      "Lite",
      undefined,
      PLAN_LIMITS,
    );
    expect(generateTitle).toHaveBeenCalledOnce();
    expect(generateTitle).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: expect.any(String),
          role: "user",
          whois: "user",
          content: "new chat",
        }),
      ],
      "Lite",
      "strategist",
      expect.objectContaining({
        chat: expect.objectContaining({
          lite: expect.any(String),
          pro: expect.any(String),
          premium: expect.any(String),
        }),
      }),
    );
    expect(createTask).toHaveBeenCalledWith({
      title: "Generated title",
      messages: [
        expect.objectContaining({
          id: expect.any(String),
          role: "user",
          whois: "user",
          content: "new chat",
        }),
      ],
      usage: 7,
      personaId: "strategist",
      promptCount: 1,
      estimatedBytes: expect.any(Number),
    });
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: "new chat",
          }),
        ],
        taskId: NEW_TASK_ID,
        userId: "user_123",
        personaId: "strategist",
        planName: "Lite",
        taskClass: "standard",
        budgetState: "normal",
        entitlements: expect.objectContaining({
          planName: "Lite",
          supportsAudioGeneration: true,
        }),
      }),
    );
    expect(updateTask).toHaveBeenCalledWith(
      NEW_TASK_ID,
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: "new chat",
          }),
          expect.objectContaining({
            id: expect.any(String),
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Hello from AI" }],
          }),
        ],
        usage: 11,
        personaId: "strategist",
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

  it("streams chunk and final events when the client requests a streaming response", async () => {
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
          generatedImage: false,
          generatedAudio: false,
        };
      },
    );

    const response = await POST(
      buildRequest(
        {
          messages: [{ role: "user", whois: "user", content: "new chat" }],
        },
        {
          Accept: "text/event-stream",
          "x-droplet-stream": "1",
        },
      ),
    );
    const payload = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    expect(generateStreamingResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: NEW_TASK_ID,
        userId: "user_123",
        personaId: "strategist",
        taskClass: "standard",
        budgetState: "normal",
      }),
    );
    expect(generateResponse).not.toHaveBeenCalled();
    expect(payload).toContain('"type":"meta"');
    expect(payload).toContain('"type":"chunk"');
    expect(payload).toContain('"snapshot":"Hello"');
    expect(payload).toContain('"type":"final"');
    expect(payload).toContain('"taskId":"507f1f77bcf86cd799439012"');
  });

  it("emits an SSE error event when streaming response generation fails", async () => {
    vi.mocked(generateStreamingResponse).mockResolvedValue({
      errorType: "rate_limit",
    } as never);

    const response = await POST(
      buildRequest(
        {
          messages: [{ role: "user", whois: "user", content: "new chat" }],
        },
        {
          Accept: "text/event-stream",
          "x-droplet-stream": "1",
        },
      ),
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"type":"error"');
    expect(payload).not.toContain('"type":"final"');
  });

  it("classifies explicitly deep Premium requests as complex and sets server-side premium intent", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Premium",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);

    await POST(
      buildRequest({
        messages: [
          {
            role: "user",
            whois: "user",
            content:
              "Please do a deep analysis of this production database migration and explain the trade-offs step by step.",
          },
        ],
      }),
    );

    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        planName: "Premium",
        taskClass: "complex",
        explicitPremium: true,
      }),
    );
  });

  it("uses the persisted task state and persona for existing conversations", async () => {
    const resolveEntitlementsSpy = vi.spyOn(
      entitlementsUtils,
      "resolveEntitlements",
    );
    const checkUsageLimitSpy = vi.spyOn(usageLimitUtils, "checkUsageLimit");

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        personaId: "strategist",
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(getTaskByIdForUser).toHaveBeenCalledWith({
      taskId: EXISTING_TASK_ID,
      userId: "user_123",
    });
    expect(generateTitle).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(incrementPromptCountIfBelowLimit).toHaveBeenCalledWith({
      taskId: EXISTING_TASK_ID,
      limit: 10,
    });
    expect(resolveEntitlementsSpy).toHaveBeenCalledWith(
      "Lite",
      expect.objectContaining({
        isAdmin: false,
      }),
    );
    expect(checkUsageLimitSpy).toHaveBeenCalledTimes(3);
    expect(checkUsageLimitSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        planName: "Lite",
        limitType: "images",
      }),
    );
    expect(checkUsageLimitSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        planName: "Lite",
        limitType: "audio",
      }),
    );
    expect(checkUsageLimitSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        planName: "Lite",
        limitType: "video",
      }),
    );
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: [{ type: "text", text: "Earlier prompt" }],
          }),
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: "continue",
          }),
        ],
        taskId: EXISTING_TASK_ID,
        userId: "user_123",
        personaId: "strategist",
        planName: "Lite",
        taskClass: "standard",
        budgetState: "normal",
        entitlements: expect.objectContaining({
          planName: "Lite",
          supportsAudioGeneration: true,
        }),
      }),
    );
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        personaId: "strategist",
        messages: [
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: [{ type: "text", text: "Earlier prompt" }],
          }),
          expect.objectContaining({
            id: expect.any(String),
            role: "user",
            whois: "user",
            content: "continue",
          }),
          expect.objectContaining({
            id: expect.any(String),
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Hello from AI" }],
          }),
        ],
      }),
    );
    expect(payload.taskId).toBe(EXISTING_TASK_ID);
    expect(payload.personaId).toBe("strategist");
  });

  it("returns 404 when an existing conversation is not owned by the user", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(null as never);

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toContain("Conversation not found");
  });

  it("blocks new conversations when the daily limit is reached", async () => {
    vi.mocked(claimDailyConversationSlot).mockResolvedValue({
      claimed: false,
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
    expect(payload.acceptedPrompt).toBe(false);
    expect(generateTitle).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("ends the conversation when the prompt limit has already been reached", async () => {
    const resolveModelPolicySpy = vi.spyOn(aiModelPolicy, "resolveModelPolicy");

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
    expect(payload.acceptedPrompt).toBe(false);
    expect(generateResponse).not.toHaveBeenCalled();
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
    expect(resolveModelPolicySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "lite",
        feature: "chat",
        taskClass: "standard",
      }),
    );
    const resolvedPolicy = resolveModelPolicySpy.mock.results.at(-1)?.value;
    expect(resolvedPolicy).toBeDefined();
    expect(emitUsageEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        taskId: EXISTING_TASK_ID,
        personaId: "strategist",
        metrics: [
          expect.objectContaining({
            requestType: "chat",
            blocked: true,
            blockedReason: "prompt_limit_reached",
            model: resolvedPolicy?.model,
          }),
        ],
      }),
    );
  });

  it("enforces the trial prompt limit for limited personas", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask({ personaId: "teacher" }) as never,
    );
    vi.mocked(incrementPromptCountIfBelowLimit).mockResolvedValue(false);

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("trial_limit_reached");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(incrementPromptCountIfBelowLimit).toHaveBeenCalledWith({
      taskId: EXISTING_TASK_ID,
      limit: 5,
    });
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "trial_limit_reached",
        endAction: "upgrade_plan",
      }),
    );
  });

  it("returns a structured stop payload when the conversation is already ended", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask({
        status: "ended",
        endedReason: "prompt_limit_reached",
        endAction: "start_new_conversation",
      }) as never,
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.stopReason).toBe("prompt_limit_reached");
    expect(payload.endAction).toBe("start_new_conversation");
    expect(payload.acceptedPrompt).toBe(false);
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("maps OpenAI rate_limit error type to HTTP 429", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({ errorType: "rate_limit" }),
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toContain("too many requests");
  });

  it("keeps the conversation active when media generation is blocked by plan limits", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValueOnce(null as never);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        const claimResult = await claimMediaGenerationSlot?.({
          limitType: "images",
        });

        if (!claimResult?.claimed) {
          return JSON.stringify({
            blockedReason: "image_limit_reached",
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
                blockedReason: "image_limit_reached",
                latencyMs: 0,
              },
            ],
          });
        }

        return JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Image generated." }],
          },
          taskUsage: 5,
        });
      },
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate image" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("image_limit_reached");
    expect(payload.endAction).toBe("start_new_conversation");
    expect(payload.taskStatus).toBe("active");
    expect(payload.acceptedPrompt).toBe(true);
    const updatePayload = vi.mocked(updateTask).mock.calls.at(-1)?.[1];
    expect(updatePayload).toMatchObject({
      personaId: "strategist",
    });
    expect(updatePayload).not.toMatchObject({
      status: "ended",
    });
    expect(emitUsageEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        taskId: EXISTING_TASK_ID,
        metrics: expect.arrayContaining([
          expect.objectContaining({ requestType: "chat" }),
          expect.objectContaining({
            requestType: "image",
            blockedReason: "image_limit_reached",
          }),
        ]),
      }),
    );
  });

  it("uses trial media counters for limited personas and ends with trial limit reason", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask({ personaId: "teacher" }) as never,
    );
    vi.mocked(User.findOneAndUpdate).mockResolvedValueOnce(null as never);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        const claimResult = await claimMediaGenerationSlot?.({
          limitType: "images",
        });

        if (!claimResult?.claimed) {
          return JSON.stringify({
            blockedReason: "image_limit_reached",
            taskUsage: 5,
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [{ type: "text", text: "Trial limit reached." }],
            },
          });
        }

        return JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Generated image output." }],
          },
          taskUsage: 5,
        });
      },
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "generate image" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.stopReason).toBe("trial_limit_reached");
    expect(payload.endAction).toBe("upgrade_plan");
    expect(User.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      {
        clerkId: "user_123",
        "plan.trialUsage.trialImageGenerations": { $lt: 3 },
      },
      {
        $inc: {
          "plan.trialUsage.trialImageGenerations": 1,
        },
      },
      {
        new: true,
        strict: true,
        upsert: false,
      },
    );
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "trial_limit_reached",
        endAction: "upgrade_plan",
      }),
    );
  });

  it("ends the conversation when document storage approaches the MongoDB limit", async () => {
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
    expect(payload.acceptedPrompt).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "conversation_storage_limit_reached",
      }),
    );
  });

  it("claims image generation counter atomically before a successful image response", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      plan: {
        imageGenerations: 1,
      },
    } as never);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        await claimMediaGenerationSlot?.({ limitType: "images" });

        return JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Generated image output." }],
          },
          taskUsage: 10,
          generatedImage: true,
        });
      },
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "create image" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      {
        clerkId: "user_123",
        "plan.imageGenerations": { $lt: 3 },
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

  it("rejects the second image claim at the quota boundary", async () => {
    const firstClaimDoc = {
      plan: {
        imageGenerations: 3,
      },
    };
    let firstClaimed = false;
    let secondClaimed = true;

    vi.mocked(User.findOneAndUpdate)
      .mockResolvedValueOnce(firstClaimDoc as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(generateResponse).mockImplementation(
      async ({ claimMediaGenerationSlot }) => {
        const firstClaim = await claimMediaGenerationSlot?.({
          limitType: "images",
        });
        const secondClaim = await claimMediaGenerationSlot?.({
          limitType: "images",
        });

        firstClaimed = Boolean(firstClaim?.claimed);
        secondClaimed = Boolean(secondClaim?.claimed);

        return JSON.stringify({
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Generated image output." }],
          },
          taskUsage: 10,
          generatedImage: true,
        });
      },
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "create image" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(firstClaimed).toBe(true);
    expect(secondClaimed).toBe(false);
    expect(User.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      {
        clerkId: "user_123",
        "plan.imageGenerations": { $lt: 3 },
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

  it("returns 500 when response generation returns malformed JSON", async () => {
    vi.mocked(generateResponse).mockResolvedValue("not-json" as never);

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
    expect(updateTask).not.toHaveBeenCalled();
  });

  describe("conversation stop behavior", () => {
    it("sets audio_limit_reached when audio usage equals the Pro quota", async () => {
      vi.mocked(getUserById).mockResolvedValue(
        createTestUser({
          plan: {
            name: "Pro",
            expiresOn: new Date(Date.now() + 86_400_000),
            imageGenerations: 0,
            audioGenerations: 50,
            usagePeriodStart: new Date(),
          },
        }) as never,
      );
      vi.mocked(generateResponse).mockResolvedValue(
        JSON.stringify({
          blockedReason: "audio_limit_reached",
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
          messages: [
            { role: "user", whois: "user", content: "generate audio" },
          ],
        }),
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.stopReason).toBe("audio_limit_reached");
      expect(payload.endAction).toBe("start_new_conversation");
      expect(payload.taskStatus).toBe("active");
      expect(generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: expect.objectContaining({
            audioLimitReached: true,
            supportsAudioGeneration: true,
          }),
        }),
      );
    });

    it("sets video_limit_reached when video usage equals the Pro quota", async () => {
      vi.mocked(getUserById).mockResolvedValue(
        createTestUser({
          plan: {
            name: "Pro",
            expiresOn: new Date(Date.now() + 86_400_000),
            imageGenerations: 0,
            audioGenerations: 0,
            videoGenerations: 10,
            usagePeriodStart: new Date(),
          },
        }) as never,
      );
      vi.mocked(generateResponse).mockResolvedValue(
        JSON.stringify({
          blockedReason: "video_limit_reached",
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Video limit reached." }],
          },
        }),
      );

      const response = await POST(
        buildRequest({
          taskId: EXISTING_TASK_ID,
          messages: [
            { role: "user", whois: "user", content: "generate video" },
          ],
        }),
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.stopReason).toBe("video_limit_reached");
      expect(payload.endAction).toBe("start_new_conversation");
      expect(payload.taskStatus).toBe("active");
      expect(generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: expect.objectContaining({
            videoLimitReached: true,
            supportsVideoGeneration: true,
          }),
        }),
      );
      const updatePayload = vi.mocked(updateTask).mock.calls.at(-1)?.[1];
      expect(updatePayload).toMatchObject({
        personaId: "strategist",
      });
      expect(updatePayload).not.toMatchObject({
        status: "ended",
      });
    });

    it("sets billing_state_invalid with upgrade_plan when paid plan expires", async () => {
      const resolveModelPolicySpy = vi.spyOn(
        aiModelPolicy,
        "resolveModelPolicy",
      );

      vi.mocked(getUserById).mockResolvedValue(
        createTestUser({
          plan: {
            name: "Pro",
            expiresOn: new Date(Date.now() - 86_400_000),
            imageGenerations: 0,
            audioGenerations: 0,
            usagePeriodStart: new Date(),
          },
        }) as never,
      );

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
      expect(resolveModelPolicySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "pro",
          feature: "chat",
          taskClass: "standard",
        }),
      );
      const resolvedPolicy = resolveModelPolicySpy.mock.results.at(-1)?.value;
      expect(resolvedPolicy).toBeDefined();
      expect(emitUsageEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_123",
          taskId: EXISTING_TASK_ID,
          personaId: "strategist",
          metrics: [
            expect.objectContaining({
              requestType: "chat",
              blocked: true,
              blockedReason: "billing_state_invalid",
              model: resolvedPolicy?.model,
            }),
          ],
        }),
      );
    });

    it("bypasses finite-limit stop checks for Premium unlimited limits", async () => {
      vi.mocked(getUserById).mockResolvedValue(
        createTestUser({
          plan: {
            name: "Premium",
            expiresOn: new Date(Date.now() + 86_400_000),
            imageGenerations: 10_000,
            audioGenerations: 10_000,
            usagePeriodStart: new Date(),
          },
        }) as never,
      );
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

  it("self-heals when getUserById returns null and ensureUserSynced succeeds", async () => {
    vi.mocked(getUserById).mockResolvedValue(null as never);
    vi.mocked(ensureUserSynced).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() + 86_400_000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(getTaskByIdForUser).mockResolvedValue(null as never);
    vi.mocked(createTask).mockResolvedValue({
      _id: NEW_TASK_ID,
    } as never);

    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "hello" }],
        personaId: "teacher",
      }),
    );

    expect(response.status).not.toBe(503);
    expect(ensureUserSynced).toHaveBeenCalledWith("user_123");
  });

  it("returns 503 when getUserById returns null and ensureUserSynced also fails", async () => {
    vi.mocked(getUserById).mockResolvedValue(null as never);
    vi.mocked(ensureUserSynced).mockResolvedValue(null);

    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "hello" }],
        personaId: "teacher",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Account not yet provisioned");
    expect(ensureUserSynced).toHaveBeenCalledWith("user_123");
  });

  it("returns 400 when the request body is malformed JSON", async () => {
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

  it("continues request handling when emitUsageEvents throws", async () => {
    vi.mocked(emitUsageEvents).mockImplementation(() => {
      throw new Error("usage-event store unavailable");
    });

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "continue" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.taskId).toBe(EXISTING_TASK_ID);
    expect(payload.acceptedPrompt).toBe(true);
    expect(emitUsageEvents).toHaveBeenCalled();
  });
});
