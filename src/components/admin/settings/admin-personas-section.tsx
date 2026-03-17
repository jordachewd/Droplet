import { PERSONAS } from "@/constants/assistant-personas";
import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import {
  PersonaAccessSettingsFormValue,
  PERSONA_ACCESS_KEY_BY_PLAN,
} from "@/components/admin/settings/types";

interface AdminPersonasSectionProps {
  personaAccessValue: PersonaAccessSettingsFormValue;
}

export function AdminPersonasSection({
  personaAccessValue,
}: AdminPersonasSectionProps) {
  return (
    <div className="rounded-2xl border border-lightBorders-300 bg-white/70 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
      <h2 className="heading-6 mb-2">Persona Access</h2>
      <p className="mb-4 text-sm opacity-70">
        Choose which personas have full access for each plan. Unchecked personas
        become limited trial access unless blocked elsewhere.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {(["Lite", "Pro", "Premium"] as const).map((planName) => {
          const selectedPersonaIdSet = new Set(personaAccessValue[planName]);

          return (
            <form
              key={planName}
              action={updateAdminSettingAction}
              className="rounded-lg border border-lightBorders-300 p-3 dark:border-darkBorders-500"
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
                      className="flex items-center gap-2 rounded-md border border-lightBorders-300 px-2 py-1.5 text-xs dark:border-darkBorders-500"
                    >
                      <input
                        type="checkbox"
                        name="personaIds"
                        value={persona.id}
                        defaultChecked={selectedPersonaIdSet.has(persona.id)}
                      />
                      <span>{persona.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3 flex justify-end">
                <button className="btn btn-sm btn-contained" type="submit">
                  Save {planName} Persona Access
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
