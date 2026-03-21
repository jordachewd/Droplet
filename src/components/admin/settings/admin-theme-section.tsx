"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { ThemeSettingsFormValue } from "@/components/admin/settings/types";

interface AdminThemeSectionProps {
  themeValue: ThemeSettingsFormValue;
}

export function AdminThemeSection({ themeValue }: AdminThemeSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="admin-surface"
    >
      <input type="hidden" name="key" value="admin.theme" />
      <input type="hidden" name="category" value="theme" />
      <h2 className="heading-6 mb-2">Theme</h2>
      <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
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
        <AdminFormSubmitButton
          className="btn btn-md btn-contained"
          label="Save Theme"
          pendingLabel="Saving theme..."
        />
      </div>
    </AdminManagedForm>
  );
}
