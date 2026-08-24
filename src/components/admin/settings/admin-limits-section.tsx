"use client";

import { useState } from "react";
import { updateAdminSettingAction } from "@/lib/actions/admin-settings.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import {
  LimitsSettingsFormValue,
  TrialLimitsSettingsFormValue,
} from "@/components/admin/settings/types";

interface LimitInputProps {
  label: string;
  name: string;
  defaultValue: number;
}

function LimitInput({ label, name, defaultValue }: LimitInputProps) {
  const isDefaultUnlimited = defaultValue === -1;
  const [value, setValue] = useState(defaultValue);
  const isUnlimited = value === -1;
  const changedFromUnlimited = isDefaultUnlimited && !isUnlimited;

  return (
    <label className="text-sm">
      <span className="mb-1 flex items-center gap-1.5 font-medium">
        {label}
        {isUnlimited && (
          <span className="rounded bg-twilightPurple-100 px-1.5 py-0.5 text-xs font-semibold text-twilightPurple-700 dark:bg-dustyBlue-1000 dark:text-dustyBlue-400">
            Unlimited
          </span>
        )}
      </span>
      <input
        type="number"
        min={-1}
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => setValue(Number(e.target.value))}
        className={`form-text-input ${
          changedFromUnlimited
            ? "border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950"
            : ""
        }`}
      />
      {changedFromUnlimited && (
        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
          âš  Changing from unlimited to a finite limit
        </span>
      )}
    </label>
  );
}

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
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.limits" />
        <input type="hidden" name="category" value="limits" />
        <h2 className="heading-6 mb-2">Limits</h2>
        <p className="mb-4 admin-muted-text">
          Adjust plan ceilings for conversations, prompts, and media generation.
          Use <strong>-1</strong> for unlimited.
        </p>
        <div className="grid grid-cols-1 gap-4">
          {(["Lite", "Pro", "Premium"] as const).map((planName) => {
            const planLimits = limitsValue[planName];
            const fieldPrefix = planName.toLowerCase();

            return (
              <fieldset
                key={planName}
                className="rounded-lg border border-slate-300 p-3 dark:border-slate-500"
              >
                <legend className="px-1 text-sm font-semibold">
                  {planName}
                </legend>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <LimitInput
                    label="Conversations / Day"
                    name={`${fieldPrefix}ConversationsPerDay`}
                    defaultValue={planLimits.conversationsPerDay}
                  />
                  <LimitInput
                    label="Prompts / Conversation"
                    name={`${fieldPrefix}PromptsPerConversation`}
                    defaultValue={planLimits.promptsPerConversation}
                  />
                  <LimitInput
                    label="Image Generations"
                    name={`${fieldPrefix}Images`}
                    defaultValue={planLimits.images}
                  />
                  <LimitInput
                    label="Audio Generations"
                    name={`${fieldPrefix}Audio`}
                    defaultValue={planLimits.audio}
                  />
                </div>
              </fieldset>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Limits"
            pendingLabel="Saving limits..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.trialLimits" />
        <input type="hidden" name="category" value="trial" />
        <h2 className="heading-6 mb-2">Trial Limits</h2>
        <p className="mb-4 admin-muted-text">
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
              className="form-text-input"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Image Generations</span>
            <input
              type="number"
              min={0}
              name="trialImages"
              defaultValue={trialLimitsValue.images}
              className="form-text-input"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Audio Generations</span>
            <input
              type="number"
              min={0}
              name="trialAudio"
              defaultValue={trialLimitsValue.audio}
              className="form-text-input"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            label="Save Trial Limits"
            pendingLabel="Saving trial limits..."
          />
        </div>
      </AdminManagedForm>
    </div>
  );
}
