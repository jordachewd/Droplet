import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { ThemeSettingsFormValue } from "@/components/admin/settings/types";

interface AdminThemeSectionProps {
  themeValue: ThemeSettingsFormValue;
}

export function AdminThemeSection({ themeValue }: AdminThemeSectionProps) {
  return (
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
  );
}
