import "server-only";

import {
  STOP_REASON_CODES,
  STOP_REASON_MESSAGES,
} from "@/constants/stop-reasons";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { isObjectRecord } from "@/lib/utils/type-guards";
import { TaskEndedReason } from "@/types/TaskData.d";

type AppSettingRecord = {
  value: unknown;
};

function normalizeStopReasonMessage({
  value,
  fallback,
}: {
  value: unknown;
  fallback: string;
}): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : fallback;
}

function normalizeStopReasonMessages(
  value: unknown,
): Record<TaskEndedReason, string> {
  const normalizedMessages: Record<TaskEndedReason, string> = {
    ...STOP_REASON_MESSAGES,
  };

  if (!isObjectRecord(value)) {
    return normalizedMessages;
  }

  for (const stopReasonCode of STOP_REASON_CODES) {
    normalizedMessages[stopReasonCode] = normalizeStopReasonMessage({
      value: value[stopReasonCode],
      fallback: STOP_REASON_MESSAGES[stopReasonCode],
    });
  }

  return normalizedMessages;
}

export async function getEffectiveStopReasonMessages(): Promise<
  Record<TaskEndedReason, string>
> {
  try {
    await connectToDatabase();

    const setting = (await AppSetting.findOne({
      key: "admin.stopReasonMessages",
    })
      .select("value")
      .lean()) as AppSettingRecord | null;

    return normalizeStopReasonMessages(setting?.value);
  } catch {
    // Intentional fallback to defaults — admin config DB errors are non-fatal.
    return { ...STOP_REASON_MESSAGES };
  }
}
