import "server-only";

import { VALID_PERSONA_ID_SET } from "@/constants/assistant-personas";
import AppSetting from "@/lib/database/models/app-setting.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getCachedConfigValue } from "@/lib/utils/config-cache";
import { DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN } from "@/lib/utils/resolve-entitlements";
import { PersonaId } from "@/types/PersonaData.d";
import { PlanName } from "@/types/PlanData.d";

type AppSettingRecord = {
  key: string;
  value: unknown;
};

export type FullPersonaAccessByPlan = Record<PlanName, PersonaId[]>;

const PERSONA_ACCESS_KEY_BY_PLAN: Record<PlanName, string> = {
  Lite: "persona_access_lite",
  Pro: "persona_access_pro",
  Premium: "persona_access_premium",
};

function normalizePersonaIdArray(
  value: unknown,
  fallback: PersonaId[],
): PersonaId[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter(
    (entry): entry is PersonaId =>
      typeof entry === "string" && VALID_PERSONA_ID_SET.has(entry as PersonaId),
  );

  return normalized;
}

export async function getEffectivePersonaAccessByPlan(): Promise<FullPersonaAccessByPlan> {
  return getCachedConfigValue({
    key: "effective-persona-access-by-plan",
    resolver: async () => {
      try {
        await connectToDatabase();

        const settings = (await AppSetting.find({
          key: {
            $in: Object.values(PERSONA_ACCESS_KEY_BY_PLAN),
          },
        })
          .select("key value")
          .lean()) as AppSettingRecord[];

        const settingMap = new Map(
          settings.map((setting) => [setting.key, setting]),
        );

        return {
          Lite: normalizePersonaIdArray(
            settingMap.get(PERSONA_ACCESS_KEY_BY_PLAN.Lite)?.value,
            DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite,
          ),
          Pro: normalizePersonaIdArray(
            settingMap.get(PERSONA_ACCESS_KEY_BY_PLAN.Pro)?.value,
            DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro,
          ),
          Premium: normalizePersonaIdArray(
            settingMap.get(PERSONA_ACCESS_KEY_BY_PLAN.Premium)?.value,
            DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium,
          ),
        };
      } catch {
        // Intentional fallback to defaults - admin config DB errors are non-fatal.
        return {
          Lite: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Lite],
          Pro: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Pro],
          Premium: [...DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN.Premium],
        };
      }
    },
  });
}
