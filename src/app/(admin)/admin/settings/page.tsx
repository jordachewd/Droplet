import PageHead from "@/components/layout/page-head";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-queries";
import { ModelSettingsFormValue } from "@/types/AdminData.d";
import { AdminModelsSection } from "@/components/admin/settings/admin-models-section";
import { AdminPricingSection } from "@/components/admin/settings/admin-pricing-section";
import { AdminLimitsSection } from "@/components/admin/settings/admin-limits-section";
import { AdminPersonasSection } from "@/components/admin/settings/admin-personas-section";
import { AdminThemeSection } from "@/components/admin/settings/admin-theme-section";
import { AdminSupportSection } from "@/components/admin/settings/admin-support-section";
import { AdminStopReasonsSection } from "@/components/admin/settings/admin-stop-reasons-section";
import { AdminSettingsTabs } from "@/components/admin/settings/admin-settings-tabs";
import { AdminWebsiteContentSection } from "@/components/admin/settings/admin-website-content-section";
import {
  AUDIO_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
} from "@/constants/admin-options";
import {
  normalizeAboutContentSettings,
  normalizeFaqContentSettings,
  normalizeHeroContentSettings,
  normalizeLandingContentSettings,
  normalizeLimitsSettingsValue,
  normalizeModelSettingsValue,
  normalizePersonaAccessSettings,
  normalizePersonaContentSettings,
  normalizePricingSettingsValue,
  normalizeStopReasonMessagesSettings,
  normalizeSupportSettingsValue,
  normalizeThemeSettingsValue,
  normalizeTrialLimitsSettingsValue,
} from "@/components/admin/settings/normalize-admin-settings";
import {
  AboutContentSettingsFormValue,
  FaqContentSettingsFormValue,
  HeroContentSettingsFormValue,
  LandingContentSettingsFormValue,
  LimitsSettingsFormValue,
  PersonaAccessSettingsFormValue,
  PersonaContentSettingsFormValue,
  PricingSettingsFormValue,
  StopReasonMessagesSettingsFormValue,
  SupportSettingsFormValue,
  ThemeSettingsFormValue,
  TrialLimitsSettingsFormValue,
} from "@/components/admin/settings/types";
import { PersonaId } from "@/types/PersonaData.d";
import { STOP_REASON_CODES } from "@/constants/stop-reasons";

export default async function AdminSettingsPage() {
  const snapshot = await getAdminSettingsSnapshot();
  const modelDefaults = snapshot.defaults.models as ModelSettingsFormValue;
  const pricingDefaults = snapshot.defaults.pricing as PricingSettingsFormValue;
  const limitsDefaults = snapshot.defaults.limits as LimitsSettingsFormValue;
  const trialLimitsDefaults = snapshot.defaults
    .trialLimits as TrialLimitsSettingsFormValue;
  const themeDefaults = snapshot.defaults.theme as ThemeSettingsFormValue;
  const supportDefaults = snapshot.defaults.support as SupportSettingsFormValue;
  const stopReasonMessagesDefaults = snapshot.defaults
    .stopReasonMessages as StopReasonMessagesSettingsFormValue;
  const personaAccessDefaults = snapshot.defaults
    .personaAccess as PersonaAccessSettingsFormValue;
  const personaContentDefaults = snapshot.defaults
    .personaContent as PersonaContentSettingsFormValue;
  const faqContentDefaults = snapshot.defaults
    .faqContent as FaqContentSettingsFormValue;
  const heroContentDefaults = snapshot.defaults
    .heroContent as HeroContentSettingsFormValue;
  const landingContentDefaults = snapshot.defaults
    .landingContent as LandingContentSettingsFormValue;
  const aboutContentDefaults = snapshot.defaults
    .aboutContent as AboutContentSettingsFormValue;

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
  const supportValue = normalizeSupportSettingsValue(
    snapshot.settingsByKey["admin.supportEmail"]?.value,
    supportDefaults,
  );
  const stopReasonMessagesValue = normalizeStopReasonMessagesSettings(
    snapshot.settingsByKey["admin.stopReasonMessages"]?.value,
    stopReasonMessagesDefaults,
  );
  const personaAccessValue = normalizePersonaAccessSettings(
    snapshot.settingsByKey as Record<string, { value: unknown }>,
    personaAccessDefaults,
  );
  const personaContentValue = normalizePersonaContentSettings(
    snapshot.settingsByKey["admin.personaOverrides"]?.value,
    personaContentDefaults,
  );
  const faqContentValue = normalizeFaqContentSettings(
    snapshot.settingsByKey["admin.faqContent"]?.value,
    faqContentDefaults,
  );
  const heroContentValue = normalizeHeroContentSettings(
    snapshot.settingsByKey["admin.heroContent"]?.value,
    heroContentDefaults,
  );
  const landingContentValue = normalizeLandingContentSettings(
    snapshot.settingsByKey["admin.landingContent"]?.value,
    landingContentDefaults,
  );
  const aboutContentValue = normalizeAboutContentSettings(
    snapshot.settingsByKey["admin.aboutContent"]?.value,
    aboutContentDefaults,
  );
  const personaIds = Object.keys(personaContentDefaults) as PersonaId[];

  return (
    <section className="AdminSettingsPage mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHead
        title="Settings"
        subtitle="Persist mutable operational settings for models, pricing, limits, persona content/access, and default theme."
      />

      <AdminSettingsTabs
        tabs={[
          {
            id: "models",
            label: "Models",
            content: (
              <AdminModelsSection
                modelValue={modelValue}
                modelOptions={{
                  chat: CHAT_MODEL_OPTIONS,
                  image: IMAGE_MODEL_OPTIONS,
                  audio: AUDIO_MODEL_OPTIONS,
                  video: VIDEO_MODEL_OPTIONS,
                }}
              />
            ),
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
              <AdminPersonasSection
                personaAccessValue={personaAccessValue}
                personaContentValue={personaContentValue}
                personaIds={personaIds}
              />
            ),
          },
          {
            id: "theme",
            label: "Theme",
            content: <AdminThemeSection themeValue={themeValue} />,
          },
          {
            id: "support",
            label: "Support",
            content: <AdminSupportSection supportValue={supportValue} />,
          },
          {
            id: "stop-reasons",
            label: "Stop Messages",
            content: (
              <AdminStopReasonsSection
                stopReasonCodes={STOP_REASON_CODES}
                stopReasonMessagesValue={stopReasonMessagesValue}
              />
            ),
          },
          {
            id: "website-copy",
            label: "Website Copy",
            content: (
              <AdminWebsiteContentSection
                faqContentValue={faqContentValue}
                heroContentValue={heroContentValue}
                landingContentValue={landingContentValue}
                aboutContentValue={aboutContentValue}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
