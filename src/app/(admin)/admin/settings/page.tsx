import PageHead from "@/components/layout/page-head";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-queries";
import { ModelSettingsFormValue } from "@/types/AdminData.d";
import { AdminModelsSection } from "@/components/admin/settings/admin-models-section";
import { AdminPricingSection } from "@/components/admin/settings/admin-pricing-section";
import { AdminLimitsSection } from "@/components/admin/settings/admin-limits-section";
import { AdminPersonasSection } from "@/components/admin/settings/admin-personas-section";
import { AdminThemeSection } from "@/components/admin/settings/admin-theme-section";
import { AdminSettingsTabs } from "@/components/admin/settings/admin-settings-tabs";
import {
  normalizeLimitsSettingsValue,
  normalizeModelSettingsValue,
  normalizePersonaAccessSettings,
  normalizePricingSettingsValue,
  normalizeThemeSettingsValue,
  normalizeTrialLimitsSettingsValue,
} from "@/components/admin/settings/normalize-admin-settings";
import {
  LimitsSettingsFormValue,
  PersonaAccessSettingsFormValue,
  PricingSettingsFormValue,
  ThemeSettingsFormValue,
  TrialLimitsSettingsFormValue,
} from "@/components/admin/settings/types";

export default async function AdminSettingsPage() {
  const snapshot = await getAdminSettingsSnapshot();
  const modelDefaults = snapshot.defaults.models as ModelSettingsFormValue;
  const pricingDefaults = snapshot.defaults.pricing as PricingSettingsFormValue;
  const limitsDefaults = snapshot.defaults.limits as LimitsSettingsFormValue;
  const trialLimitsDefaults = snapshot.defaults
    .trialLimits as TrialLimitsSettingsFormValue;
  const themeDefaults = snapshot.defaults.theme as ThemeSettingsFormValue;
  const personaAccessDefaults = snapshot.defaults
    .personaAccess as PersonaAccessSettingsFormValue;

  const modelValue = normalizeModelSettingsValue(
    snapshot.settingsByKey["admin.models"]?.value,
    modelDefaults,
  );
  const pricingValue = normalizePricingSettingsValue(
    snapshot.settingsByKey["admin.pricing"]?.value,
    pricingDefaults,
  );
  const limitsValue = normalizeLimitsSettingsValue(
    snapshot.settingsByKey["admin.limits"]?.value,
    limitsDefaults,
  );
  const trialLimitsValue = normalizeTrialLimitsSettingsValue(
    snapshot.settingsByKey["admin.trialLimits"]?.value,
    trialLimitsDefaults,
  );
  const themeValue = normalizeThemeSettingsValue(
    snapshot.settingsByKey["admin.theme"]?.value,
    themeDefaults,
  );
  const personaAccessValue = normalizePersonaAccessSettings(
    snapshot.settingsByKey as Record<string, { value: unknown }>,
    personaAccessDefaults,
  );

  return (
    <section className="AdminSettingsPage mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHead
        title="Settings"
        subtitle="Persist mutable operational settings for models, pricing, limits, persona access, and default theme."
      />

      <AdminSettingsTabs
        tabs={[
          {
            id: "models",
            label: "Models",
            content: <AdminModelsSection modelValue={modelValue} />,
          },
          {
            id: "plans-pricing",
            label: "Plans & Pricing",
            content: <AdminPricingSection pricingValue={pricingValue} />,
          },
          {
            id: "limits",
            label: "Limits",
            content: (
              <AdminLimitsSection
                limitsValue={limitsValue}
                trialLimitsValue={trialLimitsValue}
              />
            ),
          },
          {
            id: "personas",
            label: "Personas",
            content: (
              <AdminPersonasSection personaAccessValue={personaAccessValue} />
            ),
          },
          {
            id: "theme",
            label: "Theme",
            content: <AdminThemeSection themeValue={themeValue} />,
          },
        ]}
      />
    </section>
  );
}
