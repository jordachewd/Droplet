import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";
import { checkDailyConversationLimit } from "@/lib/utils/check-daily-conversations";
import { getTaskByIdForUser } from "@/lib/utils/task-queries";

vi.mock("@/lib/utils/openai/generateResponse", () => ({
  generateResponse: vi.fn(),
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

describe("POST /api/openai", () => {
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
      JSON.stringify({ title: "Generated title", usage: 7 }),
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
      }),
    );
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
    expect(payload.error).toContain("plan has expired");
  });

  it("creates a new task when no taskId is provided", async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: "user", whois: "user", content: "new chat" }],
      }),
    );
    const payload = await response.json();

    expect(checkDailyConversationLimit).toHaveBeenCalledWith(
      "user_123",
      "Lite",
    );
    expect(generateTitle).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith({
      title: "Generated title",
      messages: [{ role: "user", whois: "user", content: "new chat" }],
      usage: 7,
      personaId: "strategist",
      promptCount: 1,
      estimatedBytes: expect.any(Number),
    });
    expect(generateResponse).toHaveBeenCalledWith({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
      taskId: NEW_TASK_ID,
      userId: "user_123",
      personaId: "strategist",
      entitlements: expect.objectContaining({
        planName: "Lite",
      }),
    });
    expect(updateTask).toHaveBeenCalledWith(
      NEW_TASK_ID,
      expect.objectContaining({
        messages: [
          { role: "user", whois: "user", content: "new chat" },
          {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Hello from AI" }],
          },
        ],
        usage: 11,
        personaId: "strategist",
        promptCountIncrement: 0,
      }),
    );
    expect(payload.taskId).toBe(NEW_TASK_ID);
    expect(payload.personaId).toBe("strategist");
  });

  it("uses the persisted task state and persona for existing conversations", async () => {
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
    expect(generateResponse).toHaveBeenCalledWith({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Earlier prompt" }],
        },
        { role: "user", whois: "user", content: "continue" },
      ],
      taskId: EXISTING_TASK_ID,
      userId: "user_123",
      personaId: "teacher",
      entitlements: expect.objectContaining({
        planName: "Lite",
      }),
    });
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        personaId: "teacher",
        promptCountIncrement: 1,
        messages: [
          {
            role: "user",
            whois: "user",
            content: [{ type: "text", text: "Earlier prompt" }],
          },
          { role: "user", whois: "user", content: "continue" },
          {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "Hello from AI" }],
          },
        ],
      }),
    );
    expect(payload.taskId).toBe(EXISTING_TASK_ID);
    expect(payload.personaId).toBe("teacher");
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
    expect(payload.acceptedPrompt).toBe(false);
    expect(createTask).not.toHaveBeenCalled();
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("ends the conversation when the prompt limit has already been reached", async () => {
    vi.mocked(getTaskByIdForUser).mockResolvedValue(
      createExistingTask({
        promptCount: 10,
        estimatedBytes: 512,
      }) as never,
    );
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
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "prompt_limit_reached",
        endAction: "start_new_conversation",
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

  it("ends the conversation when media generation is blocked by plan limits", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "image_limit",
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
    expect(payload.acceptedPrompt).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      EXISTING_TASK_ID,
      expect.objectContaining({
        status: "ended",
        endedReason: "media_limit_reached",
        endAction: "upgrade_plan",
        promptCountIncrement: 1,
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
        promptCountIncrement: 1,
      }),
    );
  });

  it("increments image generation counter after a successful image response", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Generated image output." }],
        },
        taskUsage: 10,
        generatedImage: true,
      }),
    );

    const response = await POST(
      buildRequest({
        taskId: EXISTING_TASK_ID,
        messages: [{ role: "user", whois: "user", content: "create image" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { clerkId: "user_123" },
      {
        $inc: {
          "plan.imageGenerations": 1,
        },
      },
      {
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
});
