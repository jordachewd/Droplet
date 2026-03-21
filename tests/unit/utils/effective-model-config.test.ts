import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/database/mongoose";
import AppSetting from "@/lib/database/models/app-setting.model";
import { getEffectiveModelConfig } from "@/lib/utils/effective-model-config";

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

function mockModelSetting(value: unknown) {
  const leanMock = vi.fn().mockResolvedValue(value ? { value } : null);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  vi.mocked(AppSetting.findOne).mockReturnValue({
    select: selectMock,
  } as never);
}

describe("getEffectiveModelConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("returns default model settings when admin.models is missing", async () => {
    mockModelSetting(null);

    const config = await getEffectiveModelConfig();

    expect(config).toEqual({
      liteChatModel: "gpt-4o-mini",
      proChatModel: "gpt-4.1",
      premiumChatModel: "gpt-4.1",
      imageModel: "gpt-image-1.5",
      audioModel: "gpt-audio-mini",
      videoModel: "sora-2",
    });
  });

  it("uses persisted admin model settings", async () => {
    mockModelSetting({
      liteChatModel: "gpt-4.1-mini",
      proChatModel: "gpt-4.1",
      premiumChatModel: "gpt-5.4",
      imageModel: "gpt-image-1",
      audioModel: "gpt-4o-mini-tts",
      videoModel: "sora-2-pro",
    });

    const config = await getEffectiveModelConfig();

    expect(config).toEqual({
      liteChatModel: "gpt-4.1-mini",
      proChatModel: "gpt-4.1",
      premiumChatModel: "gpt-5.4",
      imageModel: "gpt-image-1",
      audioModel: "gpt-4o-mini-tts",
      videoModel: "sora-2-pro",
    });
  });
});
