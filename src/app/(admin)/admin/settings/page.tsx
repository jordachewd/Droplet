import PageHead from "@/components/layout/page-head";
import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { PERSONAS } from "@/constants/assistant-personas";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-queries";
import { PlanLimits } from "@/constants/plans";
import { PersonaId } from "@/types/PersonaData.d";

interface ModelSettingsFormValue {
  liteChatModel: string;
  proChatModel: string;
  premiumChatModel: string;
  imageModel: string;
  audioModel: string;
}

interface PricingSettingsFormValue {
  proPrice: number;
  premiumPrice: number;
}

interface ThemeSettingsFormValue {
  defaultMode: "light" | "dark";
}

type LimitsSettingsFormValue = PlanLimits;

type PersonaAccessSettingsFormValue = Record<
  "Lite" | "Pro" | "Premium",
  PersonaId[]
>;

const PERSONA_ACCESS_KEY_BY_PLAN = {
  Lite: "persona_access_lite",
  Pro: "persona_access_pro",
  Premium: "persona_access_premium",
} as const;

const VALID_PERSONA_ID_SET = new Set(PERSONAS.map((persona) => persona.id));

const CHAT_MODEL_OPTIONS = [
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-5.4",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
];

const IMAGE_MODEL_OPTIONS = [
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "gpt-image-1",
];
const AUDIO_MODEL_OPTIONS = [
  "gpt-4o-mini-tts",
  "gpt-audio-mini",
  "gpt-audio-1.5",
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumericValue(
  source: Record<string, unknown>,
  key: string,
  fallbackValue: number,
): number {
  const rawValue = source[key];
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return fallbackValue;
  }

  return rawValue;
}

function normalizeModelSettingsValue(
  value: unknown,
  defaults: ModelSettingsFormValue,
): ModelSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  const liteChatModel =
    typeof value.liteChatModel === "string"
      ? value.liteChatModel
      : typeof value.lite === "object" &&
          value.lite &&
          "chat" in value.lite &&
          typeof (
            value.lite as {
              chat?: { taskClasses?: { standard?: { model?: string } } };
            }
          ).chat?.taskClasses?.standard?.model === "string"
        ? (
            value.lite as {
              chat: { taskClasses: { standard: { model: string } } };
            }
          ).chat.taskClasses.standard.model
        : defaults.liteChatModel;
  const proChatModel =
    typeof value.proChatModel === "string"
      ? value.proChatModel
      : typeof value.pro === "object" &&
          value.pro &&
          "chat" in value.pro &&
          typeof (
            value.pro as {
              chat?: { taskClasses?: { standard?: { model?: string } } };
            }
          ).chat?.taskClasses?.standard?.model === "string"
        ? (
            value.pro as {
              chat: { taskClasses: { standard: { model: string } } };
            }
          ).chat.taskClasses.standard.model
        : defaults.proChatModel;
  const premiumChatModel =
    typeof value.premiumChatModel === "string"
      ? value.premiumChatModel
      : typeof value.premium === "object" &&
          value.premium &&
          "chat" in value.premium &&
          typeof (
            value.premium as {
              chat?: { taskClasses?: { standard?: { model?: string } } };
            }
          ).chat?.taskClasses?.standard?.model === "string"
        ? (
            value.premium as {
              chat: { taskClasses: { standard: { model: string } } };
            }
          ).chat.taskClasses.standard.model
        : defaults.premiumChatModel;
  const imageModel =
    typeof value.imageModel === "string"
      ? value.imageModel
      : defaults.imageModel;
  const audioModel =
    typeof value.audioModel === "string"
      ? value.audioModel
      : defaults.audioModel;

  return {
    liteChatModel,
    proChatModel,
    premiumChatModel,
    imageModel,
    audioModel,
  };
}

function normalizePricingSettingsValue(
  value: unknown,
  defaults: PricingSettingsFormValue,
): PricingSettingsFormValue {
  if (Array.isArray(value)) {
    const proPlan = value.find(
      (item): item is { name: string; price?: number } =>
        isObjectRecord(item) && item.name === "Pro",
    );
    const premiumPlan = value.find(
      (item): item is { name: string; price?: number } =>
        isObjectRecord(item) && item.name === "Premium",
    );

    return {
      proPrice:
        typeof proPlan?.price === "number" && Number.isFinite(proPlan.price)
          ? proPlan.price
          : defaults.proPrice,
      premiumPrice:
        typeof premiumPlan?.price === "number" &&
        Number.isFinite(premiumPlan.price)
          ? premiumPlan.price
          : defaults.premiumPrice,
    };
  }

  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    proPrice: readNumericValue(value, "proPrice", defaults.proPrice),
    premiumPrice: readNumericValue(
      value,
      "premiumPrice",
      defaults.premiumPrice,
    ),
  };
}

function normalizeLimitsSettingsValue(
  value: unknown,
  defaults: LimitsSettingsFormValue,
): LimitsSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  const liteValue = isObjectRecord(value.Lite) ? value.Lite : {};
  const proValue = isObjectRecord(value.Pro) ? value.Pro : {};
  const premiumValue = isObjectRecord(value.Premium) ? value.Premium : {};

  return {
    Lite: {
      conversationsPerDay: readNumericValue(
        liteValue,
        "conversationsPerDay",
        defaults.Lite.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        liteValue,
        "promptsPerConversation",
        defaults.Lite.promptsPerConversation,
      ),
      images: readNumericValue(liteValue, "images", defaults.Lite.images),
      audio: readNumericValue(liteValue, "audio", defaults.Lite.audio),
      video: readNumericValue(liteValue, "video", defaults.Lite.video),
    },
    Pro: {
      conversationsPerDay: readNumericValue(
        proValue,
        "conversationsPerDay",
        defaults.Pro.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        proValue,
        "promptsPerConversation",
        defaults.Pro.promptsPerConversation,
      ),
      images: readNumericValue(proValue, "images", defaults.Pro.images),
      audio: readNumericValue(proValue, "audio", defaults.Pro.audio),
      video: readNumericValue(proValue, "video", defaults.Pro.video),
    },
    Premium: {
      conversationsPerDay: readNumericValue(
        premiumValue,
        "conversationsPerDay",
        defaults.Premium.conversationsPerDay,
      ),
      promptsPerConversation: readNumericValue(
        premiumValue,
        "promptsPerConversation",
        defaults.Premium.promptsPerConversation,
      ),
      images: readNumericValue(premiumValue, "images", defaults.Premium.images),
      audio: readNumericValue(premiumValue, "audio", defaults.Premium.audio),
      video: readNumericValue(premiumValue, "video", defaults.Premium.video),
    },
  };
}

function normalizeThemeSettingsValue(
  value: unknown,
  defaults: ThemeSettingsFormValue,
): ThemeSettingsFormValue {
  if (!isObjectRecord(value)) {
    return defaults;
  }

  return {
    defaultMode: value.defaultMode === "dark" ? "dark" : defaults.defaultMode,
  };
}

function normalizePersonaAccessValue(
  value: unknown,
  fallback: PersonaId[],
): PersonaId[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter(
    (entry): entry is PersonaId =>
      typeof entry === "string" && VALID_PERSONA_ID_SET.has(entry as PersonaId),
  );
}

function normalizePersonaAccessSettings(
  settingsByKey: Record<string, { value: unknown }>,
  defaults: PersonaAccessSettingsFormValue,
): PersonaAccessSettingsFormValue {
  return {
    Lite: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Lite]?.value,
      defaults.Lite,
    ),
    Pro: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Pro]?.value,
      defaults.Pro,
    ),
    Premium: normalizePersonaAccessValue(
      settingsByKey[PERSONA_ACCESS_KEY_BY_PLAN.Premium]?.value,
      defaults.Premium,
    ),
  };
}

export default async function AdminSettingsPage() {
  const snapshot = await getAdminSettingsSnapshot();
  const modelDefaults = snapshot.defaults.models as ModelSettingsFormValue;
  const pricingDefaults = snapshot.defaults.pricing as PricingSettingsFormValue;
  const limitsDefaults = snapshot.defaults.limits as LimitsSettingsFormValue;
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <form
          action={updateAdminSettingAction}
          className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
        >
          <input type="hidden" name="key" value="admin.models" />
          <input type="hidden" name="category" value="models" />
          <h2 className="heading-6 mb-2">AI Models</h2>
          <p className="mb-4 text-sm opacity-70">
            Choose model defaults by plan and media type.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Lite Chat Model</span>
              <select
                name="liteChatModel"
                defaultValue={modelValue.liteChatModel}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              >
                {CHAT_MODEL_OPTIONS.map((modelId) => (
                  <option key={`lite-chat-${modelId}`} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Pro Chat Model</span>
              <select
                name="proChatModel"
                defaultValue={modelValue.proChatModel}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              >
                {CHAT_MODEL_OPTIONS.map((modelId) => (
                  <option key={`pro-chat-${modelId}`} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Premium Chat Model</span>
              <select
                name="premiumChatModel"
                defaultValue={modelValue.premiumChatModel}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              >
                {CHAT_MODEL_OPTIONS.map((modelId) => (
                  <option key={`premium-chat-${modelId}`} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                Default Image Model
              </span>
              <select
                name="imageModel"
                defaultValue={modelValue.imageModel}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              >
                {IMAGE_MODEL_OPTIONS.map((modelId) => (
                  <option key={`image-${modelId}`} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                Default Audio Model
              </span>
              <select
                name="audioModel"
                defaultValue={modelValue.audioModel}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              >
                {AUDIO_MODEL_OPTIONS.map((modelId) => (
                  <option key={`audio-${modelId}`} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-md btn-contained" type="submit">
              Save Models
            </button>
          </div>
        </form>

        <form
          action={updateAdminSettingAction}
          className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
        >
          <input type="hidden" name="key" value="admin.pricing" />
          <input type="hidden" name="category" value="plans" />
          <h2 className="heading-6 mb-2">Pricing</h2>
          <p className="mb-4 text-sm opacity-70">
            Manage Pro and Premium monthly prices.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Pro Price (USD)</span>
              <input
                type="number"
                min={0}
                step={1}
                name="proPrice"
                defaultValue={pricingValue.proPrice}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                Premium Price (USD)
              </span>
              <input
                type="number"
                min={0}
                step={1}
                name="premiumPrice"
                defaultValue={pricingValue.premiumPrice}
                className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-md btn-contained" type="submit">
              Save Pricing
            </button>
          </div>
        </form>

        <form
          action={updateAdminSettingAction}
          className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
        >
          <input type="hidden" name="key" value="admin.limits" />
          <input type="hidden" name="category" value="limits" />
          <h2 className="heading-6 mb-2">Limits</h2>
          <p className="mb-4 text-sm opacity-70">
            Adjust plan ceilings for conversations, prompts, and media
            generation.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {(["Lite", "Pro", "Premium"] as const).map((planName) => {
              const planLimits = limitsValue[planName];
              const fieldPrefix = planName.toLowerCase();

              return (
                <fieldset
                  key={planName}
                  className="rounded-lg border border-lightBorders-300 p-3 dark:border-darkBorders-500"
                >
                  <legend className="px-1 text-sm font-semibold">
                    {planName}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Conversations / Day
                      </span>
                      <input
                        type="number"
                        name={`${fieldPrefix}ConversationsPerDay`}
                        defaultValue={planLimits.conversationsPerDay}
                        className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Prompts / Conversation
                      </span>
                      <input
                        type="number"
                        name={`${fieldPrefix}PromptsPerConversation`}
                        defaultValue={planLimits.promptsPerConversation}
                        className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Image Generations
                      </span>
                      <input
                        type="number"
                        name={`${fieldPrefix}Images`}
                        defaultValue={planLimits.images}
                        className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Audio Generations
                      </span>
                      <input
                        type="number"
                        name={`${fieldPrefix}Audio`}
                        defaultValue={planLimits.audio}
                        className="w-full rounded-lg border border-lightBorders-400 bg-white px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
                      />
                    </label>
                  </div>
                  <input
                    type="hidden"
                    name={`${fieldPrefix}Video`}
                    value={planLimits.video}
                  />
                </fieldset>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-md btn-contained" type="submit">
              Save Limits
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
          <h2 className="heading-6 mb-2">Persona Access</h2>
          <p className="mb-4 text-sm opacity-70">
            Choose which personas have full access for each plan. Unchecked
            personas become limited trial access unless blocked elsewhere.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {(["Lite", "Pro", "Premium"] as const).map((planName) => {
              const selectedPersonaIdSet = new Set(
                personaAccessValue[planName],
              );

              return (
                <form
                  key={planName}
                  action={updateAdminSettingAction}
                  className="rounded-lg border border-lightBorders-300 p-3 dark:border-darkBorders-500"
                >
                  <input
                    type="hidden"
                    name="key"
                    value={PERSONA_ACCESS_KEY_BY_PLAN[planName]}
                  />
                  <input type="hidden" name="category" value="features" />
                  <fieldset>
                    <legend className="px-1 text-sm font-semibold">
                      {planName}
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                      {PERSONAS.map((persona) => (
                        <label
                          key={`${planName}-${persona.id}`}
                          className="flex items-center gap-2 rounded-md border border-lightBorders-300 px-2 py-1.5 text-xs dark:border-darkBorders-500"
                        >
                          <input
                            type="checkbox"
                            name="personaIds"
                            value={persona.id}
                            defaultChecked={selectedPersonaIdSet.has(
                              persona.id,
                            )}
                          />
                          <span>{persona.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-sm btn-contained" type="submit">
                      Save {planName} Persona Access
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </div>

        <form
          action={updateAdminSettingAction}
          className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
        >
          <input type="hidden" name="key" value="admin.theme" />
          <input type="hidden" name="category" value="theme" />
          <h2 className="heading-6 mb-2">Theme</h2>
          <p className="mb-4 text-sm opacity-70">
            Set the default theme configuration used as the admin baseline.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Default Mode</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="defaultMode"
                value="light"
                defaultChecked={themeValue.defaultMode === "light"}
              />
              Light
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="defaultMode"
                value="dark"
                defaultChecked={themeValue.defaultMode === "dark"}
              />
              Dark
            </label>
          </fieldset>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-md btn-contained" type="submit">
              Save Theme
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
