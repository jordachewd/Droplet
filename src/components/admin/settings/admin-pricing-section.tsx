"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import {
  PricingSettingsFormValue,
  StripePriceIdsSettingsFormValue,
} from "@/components/admin/settings/types";

interface AdminPricingSectionProps {
  pricingValue: PricingSettingsFormValue;
  stripePriceIdsValue: StripePriceIdsSettingsFormValue;
}

export function AdminPricingSection({
  pricingValue,
  stripePriceIdsValue,
}: AdminPricingSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.pricing" />
        <input type="hidden" name="category" value="plans" />
        <h2 className="heading-6 mb-2">Pricing</h2>
        <p className="mb-4 admin-muted-text">
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
              className="form-text-input"
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
              className="form-text-input"
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
        <p className="mb-4 admin-muted-text">
          Configure the currency symbol used across pricing surfaces.
        </p>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Display Symbol</span>
          <select
            name="currencySymbol"
            defaultValue={pricingValue.currencySymbol}
            className="form-select-input"
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

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.yearlyDiscount" />
        <input type="hidden" name="category" value="plans" />
        <h2 className="heading-6 mb-2">Yearly Discount</h2>
        <p className="mb-4 admin-muted-text">
          Configure the discount percentage applied to yearly subscriptions.
        </p>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Discount Percentage</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            name="yearlyDiscount"
            defaultValue={pricingValue.yearlyDiscount}
            className="form-text-input"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Discount"
            pendingLabel="Saving discount..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.stripePriceIds" />
        <input type="hidden" name="category" value="plans" />
        <h2 className="heading-6 mb-2">Stripe Price IDs</h2>
        <p className="mb-4 admin-muted-text">
          Set Stripe Price IDs used for checkout for each plan and billing
          cycle.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Pro Monthly Price ID</span>
            <input
              type="text"
              name="proMonthlyPriceId"
              defaultValue={stripePriceIdsValue.proMonthly}
              className="form-text-input"
              placeholder="price_..."
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Pro Yearly Price ID</span>
            <input
              type="text"
              name="proYearlyPriceId"
              defaultValue={stripePriceIdsValue.proYearly}
              className="form-text-input"
              placeholder="price_..."
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">
              Premium Monthly Price ID
            </span>
            <input
              type="text"
              name="premiumMonthlyPriceId"
              defaultValue={stripePriceIdsValue.premiumMonthly}
              className="form-text-input"
              placeholder="price_..."
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">
              Premium Yearly Price ID
            </span>
            <input
              type="text"
              name="premiumYearlyPriceId"
              defaultValue={stripePriceIdsValue.premiumYearly}
              className="form-text-input"
              placeholder="price_..."
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Price IDs"
            pendingLabel="Saving price IDs..."
          />
        </div>
      </AdminManagedForm>
    </div>
  );
}
