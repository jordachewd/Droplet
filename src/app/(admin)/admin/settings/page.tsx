import PageHead from "@/components/layout/page-head";
import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-queries";

function toTextareaValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default async function AdminSettingsPage() {
  const snapshot = await getAdminSettingsSnapshot();
  const modelValue =
    snapshot.settingsByKey["admin.models"]?.value ?? snapshot.defaults.models;
  const pricingValue =
    snapshot.settingsByKey["admin.pricing"]?.value ?? snapshot.defaults.pricing;
  const limitsValue =
    snapshot.settingsByKey["admin.limits"]?.value ?? snapshot.defaults.limits;
  const themeValue =
    snapshot.settingsByKey["admin.theme"]?.value ?? snapshot.defaults.theme;

  return (
    <section className="AdminSettingsPage mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHead
        title="Settings"
        subtitle="Persist mutable operational settings for models, pricing, limits, and default theme."
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
            Choose the model mapping used by each plan and request type.
          </p>
          <textarea
            className="min-h-72 w-full rounded-xl border border-lightBorders-400 bg-white px-3 py-3 font-mono text-xs dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            name="value"
            defaultValue={toTextareaValue(modelValue)}
          />
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
            Manage plan price and description metadata shown to operators.
          </p>
          <textarea
            className="min-h-72 w-full rounded-xl border border-lightBorders-400 bg-white px-3 py-3 font-mono text-xs dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            name="value"
            defaultValue={toTextareaValue(pricingValue)}
          />
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
          <textarea
            className="min-h-72 w-full rounded-xl border border-lightBorders-400 bg-white px-3 py-3 font-mono text-xs dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            name="value"
            defaultValue={toTextareaValue(limitsValue)}
          />
          <div className="mt-4 flex justify-end">
            <button className="btn btn-md btn-contained" type="submit">
              Save Limits
            </button>
          </div>
        </form>

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
          <textarea
            className="min-h-72 w-full rounded-xl border border-lightBorders-400 bg-white px-3 py-3 font-mono text-xs dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            name="value"
            defaultValue={toTextareaValue(themeValue)}
          />
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
