import { beforeEach, describe, expect, it, vi } from "vitest";
import UsageEvent from "@/lib/database/models/usage-event.model";
import { estimateModelCostCents } from "@/lib/utils/ai-model-policy";
import { emitUsageEvents } from "@/lib/utils/usage-event-utils";
import { createTestTask, createTestUser } from "../test-support";

vi.mock("@/lib/database/models/usage-event.model", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/utils/ai-model-policy", () => ({
  estimateModelCostCents: vi.fn(() => 7),
}));

describe("usage-event-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UsageEvent.create).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof UsageEvent.create>>,
    );
  });

  it("does nothing when no metrics are passed", () => {
    const user = createTestUser();
    const task = createTestTask();

    emitUsageEvents({
      userId: user._id,
      taskId: task._id,
      personaId: task.personaId,
      metrics: [],
    });

    expect(UsageEvent.create).not.toHaveBeenCalled();
  });

  it("maps metrics and persists usage events", () => {
    const user = createTestUser();
    const task = createTestTask();

    emitUsageEvents({
      userId: user._id,
      taskId: task._id,
      personaId: task.personaId,
      metrics: [
        {
          requestType: "chat",
          model: "gpt-4.1",
          tokensIn: 11,
          tokensOut: 22,
          latencyMs: 450,
        },
      ],
    });

    expect(estimateModelCostCents).toHaveBeenCalledWith({
      model: "gpt-4.1",
      tokensIn: 11,
      tokensOut: 22,
    });
    expect(UsageEvent.create).toHaveBeenCalledTimes(1);
    expect(UsageEvent.create).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: user._id,
        taskId: task._id,
        personaId: task.personaId,
        model: "gpt-4.1",
        provider: "openai",
        requestType: "chat",
        tokensIn: 11,
        tokensOut: 22,
        estimatedCost: 7,
        latencyMs: 450,
        blocked: false,
        createdAt: expect.any(Date),
      }),
    ]);
  });

  it("logs failures without throwing", async () => {
    const user = createTestUser();
    const task = createTestTask();
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    vi.mocked(UsageEvent.create).mockRejectedValueOnce(new Error("db down"));

    emitUsageEvents({
      userId: user._id,
      taskId: task._id,
      personaId: task.personaId,
      metrics: [{ requestType: "chat", model: "gpt-4o-mini" }],
    });

    await Promise.resolve();

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
      "Failed to emit usage event",
    );
  });
});
