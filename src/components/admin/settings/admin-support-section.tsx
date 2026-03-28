"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { SupportSettingsFormValue } from "@/components/admin/settings/types";

interface AdminSupportSectionProps {
  supportValue: SupportSettingsFormValue;
}

export function AdminSupportSection({
  supportValue,
}: AdminSupportSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="AdminSupportSection admin-surface"
    >
      <input type="hidden" name="key" value="admin.supportEmail" />
      <input type="hidden" name="category" value="features" />
      <h2 className="heading-6 mb-2">Support Contact</h2>
      <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
        Configure the support contact email used across chat, plans, legal
        pages, and stop-action guidance.
      </p>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Support Email</span>
        <input
          type="email"
          name="supportEmail"
          defaultValue={supportValue.supportEmail}
          required
          aria-required="true"
          className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
        />
      </label>

      <div className="mt-4 flex justify-end">
        <AdminFormSubmitButton
          label="Save Support Email"
          pendingLabel="Saving support email..."
        />
      </div>
    </AdminManagedForm>
  );
}
