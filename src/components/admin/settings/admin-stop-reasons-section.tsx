"use client";

import { STOP_REASON_CODES } from "@/constants/stop-reasons";
import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { StopReasonMessagesSettingsFormValue } from "@/components/admin/settings/types";

interface AdminStopReasonsSectionProps {
  stopReasonMessagesValue: StopReasonMessagesSettingsFormValue;
}

function formatStopReasonLabel(stopReasonCode: string): string {
  return stopReasonCode
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function AdminStopReasonsSection({
  stopReasonMessagesValue,
}: AdminStopReasonsSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="AdminStopReasonsSection admin-surface"
    >
      <input type="hidden" name="key" value="admin.stopReasonMessages" />
      <input type="hidden" name="category" value="features" />

      <h2 className="heading-6 mb-2">Stop Reason Messages</h2>
      <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
        Configure the user-facing message shown when the server ends or blocks a
        conversation.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {STOP_REASON_CODES.map((stopReasonCode) => (
          <label key={stopReasonCode} className="text-sm">
            <span className="mb-1 block font-medium">
              {formatStopReasonLabel(stopReasonCode)}
            </span>
            <span className="mb-2 block font-mono text-xs opacity-80">
              {stopReasonCode}
            </span>
            <textarea
              name={stopReasonCode}
              defaultValue={stopReasonMessagesValue[stopReasonCode]}
              required
              aria-required="true"
              rows={3}
              className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <AdminFormSubmitButton
          label="Save Stop Messages"
          pendingLabel="Saving stop messages..."
        />
      </div>
    </AdminManagedForm>
  );
}
