"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import {
  LimitsSettingsFormValue,
  TrialLimitsSettingsFormValue,
} from "@/components/admin/settings/types";

interface AdminLimitsSectionProps {
  limitsValue: LimitsSettingsFormValue;
  trialLimitsValue: TrialLimitsSettingsFormValue;
}

export function AdminLimitsSection({
  limitsValue,
  trialLimitsValue,
}: AdminLimitsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <AdminManagedForm
        action={updateAdminSettingAction}
        className="rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
      >
        <input type="hidden" name="key" value="admin.limits" />
        <input type="hidden" name="category" value="limits" />
        <h2 className="heading-6 mb-2">Limits</h2>
        <p className="mb-4 text-sm opacity-70">
          Adjust plan ceilings for conversations, prompts, and media generation.
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
                      className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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
                      className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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
                      className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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
                      className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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
          <AdminFormSubmitButton
            className="btn btn-md btn-contained"
            label="Save Limits"
            pendingLabel="Saving limits..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
      >
        <input type="hidden" name="key" value="admin.trialLimits" />
        <input type="hidden" name="category" value="trial" />
        <h2 className="heading-6 mb-2">Trial Limits</h2>
        <p className="mb-4 text-sm opacity-70">
          Set limits for limited-access persona trials across 30-day windows.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">
              Prompts / Conversation
            </span>
            <input
              type="number"
              min={0}
              name="trialPrompts"
              defaultValue={trialLimitsValue.promptsPerConversation}
              className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Image Generations</span>
            <input
              type="number"
              min={0}
              name="trialImages"
              defaultValue={trialLimitsValue.images}
              className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Audio Generations</span>
            <input
              type="number"
              min={0}
              name="trialAudio"
              defaultValue={trialLimitsValue.audio}
              className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Video Generations</span>
            <input
              type="number"
              min={0}
              name="trialVideo"
              defaultValue={trialLimitsValue.video}
              className="w-full rounded-lg border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            className="btn btn-md btn-contained"
            label="Save Trial Limits"
            pendingLabel="Saving trial limits..."
          />
        </div>
      </AdminManagedForm>
    </div>
  );
}
