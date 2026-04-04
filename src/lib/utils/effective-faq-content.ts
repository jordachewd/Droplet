import "server-only";

import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getCachedConfigValue } from "@/lib/utils/config-cache";
import {
  buildFaqs,
  cloneFaqItems,
  BuildFaqsConfig,
  FaqItem,
} from "@/constants/faqs";
import { isObjectRecord } from "@/lib/utils/type-guards";

type AppSettingRecord = {
  value?: unknown;
};

function normalizeFaqEntry({
  value,
  fallback,
}: {
  value: unknown;
  fallback: FaqItem;
}): FaqItem {
  if (!isObjectRecord(value)) {
    return { ...fallback };
  }

  const question =
    typeof value.question === "string" && value.question.trim().length > 0
      ? value.question.trim()
      : fallback.question;
  const answer =
    typeof value.answer === "string" && value.answer.trim().length > 0
      ? value.answer.trim()
      : fallback.answer;

  return {
    id: fallback.id,
    question,
    answer,
  };
}

function normalizeFaqContent({
  value,
  defaults,
}: {
  value: unknown;
  defaults: FaqItem[];
}): FaqItem[] {
  if (!Array.isArray(value)) {
    return cloneFaqItems(defaults);
  }

  const overridesById = new Map<number, unknown>();

  for (const item of value) {
    if (!isObjectRecord(item)) {
      continue;
    }

    if (typeof item.id !== "number" || !Number.isInteger(item.id)) {
      continue;
    }

    overridesById.set(item.id, item);
  }

  return defaults.map((defaultEntry) =>
    normalizeFaqEntry({
      value: overridesById.get(defaultEntry.id),
      fallback: defaultEntry,
    }),
  );
}

export async function getEffectiveFaqContent(
  config?: BuildFaqsConfig,
): Promise<FaqItem[]> {
  const defaults = buildFaqs(config);
  const cacheScope = config ? JSON.stringify(config) : "default";

  return getCachedConfigValue({
    key: `effective-faq-content:${cacheScope}`,
    resolver: async () => {
      try {
        await connectToDatabase();

        const setting = (await AppSetting.findOne({ key: "admin.faqContent" })
          .select("value")
          .lean()) as AppSettingRecord | null;

        return normalizeFaqContent({
          value: setting?.value,
          defaults,
        });
      } catch {
        // Intentional fallback to defaults - admin config DB errors are non-fatal.
        return defaults;
      }
    },
  });
}
