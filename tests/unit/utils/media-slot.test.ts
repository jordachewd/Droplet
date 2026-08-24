import { beforeEach, describe, expect, it, vi } from "vitest";
import User from "@/lib/database/models/user.model";
import {
  claimMediaGenerationSlot,
  resolveMediaCounterField,
  rollbackMediaGenerationSlot,
} from "@/lib/utils/openai/media-slot";

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

describe("openai media slot helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({});
  });

  it("resolves media counter fields by type and scope", () => {
    expect(resolveMediaCounterField("images", "plan")).toBe(
      "plan.imageGenerations",
    );
    expect(resolveMediaCounterField("audio", "plan")).toBe(
      "plan.audioGenerations",
    );
    expect(resolveMediaCounterField("images", "trial")).toBe(
      "plan.trialUsage.trialImageGenerations",
    );
    expect(resolveMediaCounterField("audio", "trial")).toBe(
      "plan.trialUsage.trialAudioGenerations",
    );
  });

  it("claims unlimited slots without a database write when limit is -1", async () => {
    const result = await claimMediaGenerationSlot({
      userId: "user_123",
      limitType: "images",
      limit: -1,
      counterScope: "plan",
    });

    expect(result).toEqual({
      claimed: true,
      limit: -1,
      remaining: -1,
    });
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("claims limited slots atomically and returns remaining count", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      plan: {
        imageGenerations: 1,
      },
    });

    const result = await claimMediaGenerationSlot({
      userId: "user_123",
      limitType: "images",
      limit: 3,
      counterScope: "plan",
    });

    expect(result).toEqual({
      claimed: true,
      limit: 3,
      remaining: 2,
    });
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
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
  });

  it("returns unclaimed when no slot can be acquired", async () => {
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null);

    const result = await claimMediaGenerationSlot({
      userId: "user_123",
      limitType: "audio",
      limit: 1,
      counterScope: "trial",
    });

    expect(result).toEqual({
      claimed: false,
      limit: 1,
      remaining: 0,
    });
  });

  it("rolls back a claimed media slot with a guarded decrement", async () => {
    await rollbackMediaGenerationSlot({
      userId: "user_123",
      limitType: "audio",
      counterScope: "trial",
    });

    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      {
        clerkId: "user_123",
        "plan.trialUsage.trialAudioGenerations": { $gt: 0 },
      },
      {
        $inc: {
          "plan.trialUsage.trialAudioGenerations": -1,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );
  });
});
