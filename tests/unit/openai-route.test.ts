import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/route";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { auth } from "@clerk/nextjs/server";

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
      plan: { expiresOn: new Date(Date.now() + 86400000) },
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
      }),
    );
    vi.mocked(updateTask).mockResolvedValue({} as never);
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
      plan: { expiresOn: new Date(Date.now() - 86400000) },
    } as never);
    const req = buildRequest({
      messages: [{ role: "user", whois: "user", content: "hi" }],
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("plan has expired");
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
      assistantRoleId: "strategist",
    });
    expect(generateResponse).toHaveBeenCalledWith({
      messages: [{ role: "user", whois: "user", content: "new chat" }],
      taskId: "task_123",
      assistantRoleId: "strategist",
      entitlements: expect.objectContaining({
        planName: "Lite",
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
      assistantRoleId: "strategist",
    });

    expect(payload.taskId).toBe("task_123");
    expect(payload.taskData.role).toBe("assistant");
    expect(payload.assistantRoleId).toBe("strategist");
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
      assistantRoleId: "strategist",
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
