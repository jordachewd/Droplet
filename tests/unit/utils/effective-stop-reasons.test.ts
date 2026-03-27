import { beforeEach, describe, expect, it, vi } from "vitest";
import { STOP_REASON_MESSAGES } from "@/constants/stop-reasons";
import { getEffectiveStopReasonMessages } from "@/lib/utils/effective-stop-reasons";

const { connectToDatabaseMock, findOneMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findOneMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOne: findOneMock,
  },
}));

function mockStopReasonMessagesSetting(value: unknown): void {
  findOneMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue(
          value === undefined ? null : ({ value } satisfies { value: unknown }),
        ),
    }),
  });
}

describe("effective-stop-reasons", () => {
  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneMock.mockReset();
  });

  it("applies valid admin overrides and falls back for invalid values", async () => {
    mockStopReasonMessagesSetting({
      prompt_limit_reached: " You hit the prompt limit. ",
      trial_limit_reached: "",
      media_limit_reached: 42,
      image_limit_reached: "Image cap reached.",
    });

    const messages = await getEffectiveStopReasonMessages();

    expect(messages.prompt_limit_reached).toBe("You hit the prompt limit.");
    expect(messages.image_limit_reached).toBe("Image cap reached.");
    expect(messages.trial_limit_reached).toBe(
      STOP_REASON_MESSAGES.trial_limit_reached,
    );
    expect(messages.media_limit_reached).toBe(
      STOP_REASON_MESSAGES.media_limit_reached,
    );
    expect(messages.audio_limit_reached).toBe(
      STOP_REASON_MESSAGES.audio_limit_reached,
    );
  });

  it("returns defaults when the stored setting is missing or malformed", async () => {
    mockStopReasonMessagesSetting("invalid");

    await expect(getEffectiveStopReasonMessages()).resolves.toEqual(
      STOP_REASON_MESSAGES,
    );
  });

  it("returns defaults when database access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(getEffectiveStopReasonMessages()).resolves.toEqual(
      STOP_REASON_MESSAGES,
    );
  });
});
