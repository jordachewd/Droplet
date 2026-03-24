import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODEL_POLICY_MATRIX } from "@/lib/utils/ai-model-policy";
import { getEffectiveModelConfig } from "@/lib/utils/effective-model-config";
import type { ModelSettingsFormValue } from "@/types/AdminData.d";
import { createTestUser } from "../test-support";

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

const DEFAULT_MODEL_SETTINGS: ModelSettingsFormValue = {
  liteChatModel: MODEL_POLICY_MATRIX.lite.chat.taskClasses.standard.model,
  proChatModel: MODEL_POLICY_MATRIX.pro.chat.taskClasses.standard.model,
  premiumChatModel: MODEL_POLICY_MATRIX.premium.chat.taskClasses.standard.model,
  imageModel: MODEL_POLICY_MATRIX.pro.image_generation.taskClasses.final.model,
  audioModel: MODEL_POLICY_MATRIX.pro.audio_generation.taskClasses.final.model,
  videoModel:
    MODEL_POLICY_MATRIX.pro.video_generation.taskClasses.preview.model,
};

function mockModelsSetting(value: unknown): void {
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

describe("effective-model-config", () => {
  const premiumUser = createTestUser({ plan: { name: "Premium" } });

  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneMock.mockReset();
  });

  it("uses admin model settings when valid strings are provided", async () => {
    mockModelsSetting({
      liteChatModel: "gpt-lite-custom",
      proChatModel: "gpt-pro-custom",
      premiumChatModel: "gpt-premium-custom",
      imageModel: "gpt-image-custom",
      audioModel: "gpt-audio-custom",
      videoModel: "sora-custom",
    });

    const config = await getEffectiveModelConfig();

    expect(config).toEqual({
      liteChatModel: "gpt-lite-custom",
      proChatModel: "gpt-pro-custom",
      premiumChatModel: "gpt-premium-custom",
      imageModel: "gpt-image-custom",
      audioModel: "gpt-audio-custom",
      videoModel: "sora-custom",
    });
    expect(premiumUser.plan.name).toBe("Premium");
  });

  it("falls back to defaults for empty or invalid field values", async () => {
    mockModelsSetting({
      liteChatModel: "",
      proChatModel: 123,
      premiumChatModel: "gpt-premium-custom",
      imageModel: null,
      audioModel: "gpt-audio-custom",
      videoModel: "",
    });

    const config = await getEffectiveModelConfig();

    expect(config).toEqual({
      liteChatModel: DEFAULT_MODEL_SETTINGS.liteChatModel,
      proChatModel: DEFAULT_MODEL_SETTINGS.proChatModel,
      premiumChatModel: "gpt-premium-custom",
      imageModel: DEFAULT_MODEL_SETTINGS.imageModel,
      audioModel: "gpt-audio-custom",
      videoModel: DEFAULT_MODEL_SETTINGS.videoModel,
    });
  });

  it("returns defaults when the stored setting is not an object", async () => {
    mockModelsSetting("invalid");

    const config = await getEffectiveModelConfig();

    expect(config).toEqual(DEFAULT_MODEL_SETTINGS);
  });

  it("returns defaults when database access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    const config = await getEffectiveModelConfig();

    expect(config).toEqual(DEFAULT_MODEL_SETTINGS);
  });
});
