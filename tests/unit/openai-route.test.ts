import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { auth } from "@clerk/nextjs/server";
import User from "@/lib/database/models/user.model";

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

function buildRequest(payload: unknown): Request {
  return new Request("http://localhost:3000/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/openai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86400000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateTitle).mockResolvedValue(
      JSON.stringify({ title: "Generated title", usage: 7 }),
    );
    vi.mocked(createTask).mockResolvedValue({ _id: "task_123" } as never);
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
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "hi" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Authentication required.");
  });

  it("returns 403 when user plan has expired", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() - 86400000),
      },
    } as never);
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "hi" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("plan has expired");
  });

  it("does not block Lite users when a legacy expiresOn date is in the past", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() - 86400000),
        imageGenerations: 0,
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.taskId).toBe("existing-task");
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          planName: "Lite",
        }),
      }),
    );
  });

  it("creates a new task when no taskId is provided", async () => {
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(generateTitle).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith({
      title: "Generated title",
      messages: [{ role: "user", whois: "user", content: "new chat" }],
      usage: 7,
      personaId: "strategist",
    });
    expect(generateResponse).toHaveBeenCalledWith({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
      taskId: "task_123",
      userId: "user_123",
      personaId: "strategist",
      entitlements: expect.objectContaining({
        planName: "Lite",
        imageLimitReached: false,
        audioLimitReached: false,
      }),
    });
    expect(updateTask).toHaveBeenCalledWith("task_123", {
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
    });

    expect(payload.taskId).toBe("task_123");
    expect(payload.taskData.role).toBe("assistant");
    expect(payload.personaId).toBe("strategist");
  });

  it("reuses existing taskId and skips title/task creation", async () => {
    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(generateTitle).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(generateResponse).toHaveBeenCalledWith({
      messages: [{ role: "user", whois: "user", content: "continue" }],
      taskId: "existing-task",
      userId: "user_123",
      personaId: "strategist",
      entitlements: expect.objectContaining({
        planName: "Lite",
      }),
    });
    expect(payload.taskId).toBe("existing-task");
  });

  it("returns 500 when task creation fails", async () => {
    vi.mocked(createTask).mockResolvedValue(null as never);
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
  });

  it("returns 500 when title generation returns malformed JSON", async () => {
    vi.mocked(generateTitle).mockResolvedValue("not-json" as never);
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns 500 when response payload is malformed JSON", async () => {
    vi.mocked(generateResponse).mockResolvedValue("not-json" as never);
    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("maps OpenAI rate_limit error type to HTTP 429", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({ errorType: "rate_limit" }),
    );

    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toContain("too many requests");
  });

  it("maps OpenAI timeout error type to HTTP 504", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({ errorType: "timeout" }),
    );

    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toContain("timed out");
  });

  it("maps OpenAI service_error type to HTTP 502", async () => {
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({ errorType: "service_error" }),
    );

    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toContain("temporarily unavailable");
  });

  it("returns 403 when image generation is blocked by usage limit", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86400000),
        imageGenerations: 3,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "image_limit",
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

    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "generate image" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("Image generation limit reached");
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 403 when audio generation is blocked by usage limit", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() + 86400000),
        audioGenerations: 20,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        blockedReason: "audio_limit",
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Audio generation limit reached for your current plan.",
            },
          ],
        },
      }),
    );

    const req = buildRequest({
      taskId: "existing-task",
      personaId: "teacher",
      messages: [{ role: "user", whois: "user", content: "generate audio" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("Audio generation limit reached");
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("passes the Lite combined media cap to response generation", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Lite",
        expiresOn: new Date(Date.now() + 86400000),
        imageGenerations: 2,
        audioGenerations: 1,
        usagePeriodStart: new Date(),
      },
    } as never);

    const req = buildRequest({
      taskId: "existing-task",
      personaId: "teacher",
      messages: [{ role: "user", whois: "user", content: "generate audio" }],
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          planName: "Lite",
          imageLimitReached: true,
          audioLimitReached: true,
          supportsImageGeneration: false,
          supportsAudioGeneration: false,
        }),
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

    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "create image" }],
    });

    const response = await POST(req);

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

  it("increments audio generation counter after a successful audio response", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      clerkId: "user_123",
      plan: {
        name: "Pro",
        expiresOn: new Date(Date.now() + 86400000),
        audioGenerations: 0,
        usagePeriodStart: new Date(),
      },
    } as never);
    vi.mocked(generateResponse).mockResolvedValue(
      JSON.stringify({
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Generated audio output." }],
        },
        taskUsage: 9,
        generatedAudio: true,
      }),
    );

    const req = buildRequest({
      taskId: "existing-task",
      personaId: "teacher",
      messages: [{ role: "user", whois: "user", content: "create audio" }],
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { clerkId: "user_123" },
      {
        $inc: {
          "plan.audioGenerations": 1,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );
  });

  it("returns 500 when response generation throws", async () => {
    vi.mocked(generateResponse).mockRejectedValue(
      new Error("OpenAI unavailable"),
    );
    const req = buildRequest({
      taskId: "existing-task",
      messages: [{ role: "user", whois: "user", content: "continue" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBeTypeOf("string");
  });
});
