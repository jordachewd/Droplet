"use client";

import { PERSONAS } from "@/constants/assistant-personas";
import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import {
  PersonaAccessSettingsFormValue,
  PersonaContentSettingsFormValue,
  PERSONA_ACCESS_KEY_BY_PLAN,
} from "@/components/admin/settings/types";

interface AdminPersonasSectionProps {
  personaAccessValue: PersonaAccessSettingsFormValue;
  personaContentValue: PersonaContentSettingsFormValue;
}

export function AdminPersonasSection({
  personaAccessValue,
  personaContentValue,
}: AdminPersonasSectionProps) {
  return (
    <div className="AdminPersonasSection grid grid-cols-1 gap-4">
      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface"
      >
        <input type="hidden" name="key" value="admin.personaOverrides" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6 mb-2">Persona Content</h2>
        <p className="mb-4 text-sm opacity-70">
          Edit persona labels, taglines, descriptions, and starter prompts. One
          starter prompt per line.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {PERSONAS.map((persona) => {
            const contentValue = personaContentValue[persona.id];

            return (
              <fieldset key={persona.id} className="admin-surface-subtle">
                <legend className="px-1 text-sm font-semibold">
                  {contentValue.label} ({persona.id})
                </legend>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Label</span>
                    <input
                      className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                      name={`label_${persona.id}`}
                      defaultValue={contentValue.label}
                      required
                      aria-required="true"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Tagline</span>
                    <input
                      className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                      name={`tagline_${persona.id}`}
                      defaultValue={contentValue.tagline}
                      required
                      aria-required="true"
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block font-medium">Description</span>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                      name={`description_${persona.id}`}
                      defaultValue={contentValue.description}
                      required
                      aria-required="true"
                    />
                  </label>

                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block font-medium">
                      Starter prompts (one per line)
                    </span>
                    <textarea
                      className="min-h-32 w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                      name={`starterPrompts_${persona.id}`}
                      defaultValue={contentValue.starterPrompts.join("\n")}
                      required
                      aria-required="true"
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <AdminFormSubmitButton
            className="btn btn-md btn-contained"
            label="Save Persona Content"
            pendingLabel="Saving persona content..."
          />
        </div>
      </AdminManagedForm>

      <div className="admin-surface">
        <h2 className="heading-6 mb-2">Persona Access</h2>
        <p className="mb-4 text-sm opacity-70">
          Choose which personas have full access for each plan. Unchecked
          personas become limited trial access unless blocked elsewhere.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {(["Lite", "Pro", "Premium"] as const).map((planName) => {
            const selectedPersonaIdSet = new Set(personaAccessValue[planName]);

            return (
              <AdminManagedForm
                key={planName}
                action={updateAdminSettingAction}
                className="rounded-lg border border-slate-300 p-3 dark:border-slate-500"
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
                        className="flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-500"
                      >
                        <input
                          type="checkbox"
                          name="personaIds"
                          value={persona.id}
                          defaultChecked={selectedPersonaIdSet.has(persona.id)}
                        />
                        <span>{personaContentValue[persona.id].label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-3 flex justify-end">
                  <AdminFormSubmitButton
                    className="btn btn-sm btn-contained"
                    label={`Save ${planName} Persona Access`}
                    pendingLabel="Saving..."
                  />
                </div>
              </AdminManagedForm>
            );
          })}
        </div>
      </div>
    </div>
  );
}
