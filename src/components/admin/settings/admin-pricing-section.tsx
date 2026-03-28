"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { PricingSettingsFormValue } from "@/components/admin/settings/types";

interface AdminPricingSectionProps {
  pricingValue: PricingSettingsFormValue;
}

export function AdminPricingSection({
  pricingValue,
}: AdminPricingSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.pricing" />
        <input type="hidden" name="category" value="plans" />
        <h2 className="heading-6 mb-2">Pricing</h2>
        <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Manage Pro and Premium monthly prices.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Pro Price</span>
            <input
              type="number"
              min={0}
              step={1}
              name="proPrice"
              defaultValue={pricingValue.proPrice}
              className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Premium Price</span>
            <input
              type="number"
              min={0}
              step={1}
              name="premiumPrice"
              defaultValue={pricingValue.premiumPrice}
              className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Pricing"
            pendingLabel="Saving pricing..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.currencySymbol" />
        <input type="hidden" name="category" value="plans" />
        <h2 className="heading-6 mb-2">Currency</h2>
        <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Configure the currency symbol used across pricing surfaces.
        </p>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Display Symbol</span>
          <select
            name="currencySymbol"
            defaultValue={pricingValue.currencySymbol}
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          >
            <option value="$">USD ($)</option>
            <option value="€">EUR (€)</option>
          </select>
        </label>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Currency"
            pendingLabel="Saving currency..."
          />
        </div>
      </AdminManagedForm>
    </div>
  );
}
