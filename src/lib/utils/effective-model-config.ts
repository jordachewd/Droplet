import "server-only";

import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { MODEL_POLICY_MATRIX } from "@/lib/utils/ai-model-policy";
import { ModelSettingsFormValue } from "@/types/AdminData.d";

type AppSettingRecord = {
  value: unknown;
};

const DEFAULT_MODEL_SETTINGS: ModelSettingsFormValue = {
  liteChatModel: MODEL_POLICY_MATRIX.lite.chat.taskClasses.standard.model,
  proChatModel: MODEL_POLICY_MATRIX.pro.chat.taskClasses.standard.model,
  premiumChatModel: MODEL_POLICY_MATRIX.premium.chat.taskClasses.standard.model,
  imageModel: MODEL_POLICY_MATRIX.pro.image_generation.taskClasses.final.model,
  audioModel: MODEL_POLICY_MATRIX.pro.audio_generation.taskClasses.final.model,
  videoModel:
    MODEL_POLICY_MATRIX.pro.video_generation.taskClasses.preview.model,
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStringValue({
  source,
  key,
  fallback,
}: {
  source: Record<string, unknown>;
  key: string;
  fallback: string;
}): string {
  const value = source[key];

  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  return value;
}

function normalizeModelSettings(
  value: unknown,
  defaults: ModelSettingsFormValue,
): ModelSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    liteChatModel: readStringValue({
      source: value,
      key: "liteChatModel",
      fallback: defaults.liteChatModel,
    }),
    proChatModel: readStringValue({
      source: value,
      key: "proChatModel",
      fallback: defaults.proChatModel,
    }),
    premiumChatModel: readStringValue({
      source: value,
      key: "premiumChatModel",
      fallback: defaults.premiumChatModel,
    }),
    imageModel: readStringValue({
      source: value,
      key: "imageModel",
      fallback: defaults.imageModel,
    }),
    audioModel: readStringValue({
      source: value,
      key: "audioModel",
      fallback: defaults.audioModel,
    }),
    videoModel: readStringValue({
      source: value,
      key: "videoModel",
      fallback: defaults.videoModel,
    }),
  };
}

export async function getEffectiveModelConfig(): Promise<ModelSettingsFormValue> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({ key: "admin.models" })
      .select("value")
      .lean()) as AppSettingRecord | null;

    return normalizeModelSettings(setting?.value, DEFAULT_MODEL_SETTINGS);
  } catch {
    return { ...DEFAULT_MODEL_SETTINGS };
  }
}
