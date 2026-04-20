"use client";

import { useState, useCallback } from "react";
import { ONBOARDING_STEPS } from "@/constants/onboarding";
import { updatePreferences } from "@/lib/actions/onboarding.actions";
import type {
  UserIntent,
  UserChallenge,
  UserExpectation,
  UserCommunicationStyle,
  UserPreferences,
} from "@/types/UserData.d";
import AlertMessage from "@/components/shared/alert-message";

interface SettingsFormProps {
  preferences: Partial<UserPreferences>;
}

export default function SettingsForm({
  preferences,
}: SettingsFormProps) {
  const [intent, setIntent] = useState<UserIntent | undefined>(
    preferences.intent ?? undefined,
  );
  const [challenge, setChallenge] = useState<UserChallenge | undefined>(
    preferences.challenge ?? undefined,
  );
  const [expectation, setExpectation] = useState<
    UserExpectation | undefined
  >(preferences.expectation ?? undefined);
  const [communicationStyle, setCommunicationStyle] = useState<
    UserCommunicationStyle | undefined
  >(preferences.communicationStyle ?? undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setAlert(null);

    try {
      const result = await updatePreferences({
        intent,
        challenge,
        expectation,
        communicationStyle,
      });

      if (result?.success) {
        setAlert({ type: "success", message: "Settings saved." });
      }
    } catch {
      setAlert({ type: "error", message: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  }, [intent, challenge, expectation, communicationStyle]);

  return (
    <section className="SettingsForm mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="heading-2 text-3xl font-bold">Settings</h1>
        <p className="text-sm opacity-60">
          Customize how Droplet works for you.
        </p>
      </div>

      {alert && (
        <AlertMessage type={alert.type} message={alert.message} />
      )}

      {/* Communication Preferences */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="heading-4 text-lg font-bold">Your Preferences</h2>
          <p className="text-sm opacity-60">
            These shape how your assistant communicates.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <PreferenceSelect
            label="Focus"
            value={intent}
            onChange={(v) => setIntent(v as UserIntent)}
            options={ONBOARDING_STEPS[0].options}
          />
          <PreferenceSelect
            label="Challenge"
            value={challenge}
            onChange={(v) => setChallenge(v as UserChallenge)}
            options={ONBOARDING_STEPS[1].options}
          />
          <PreferenceSelect
            label="Expectation"
            value={expectation}
            onChange={(v) => setExpectation(v as UserExpectation)}
            options={ONBOARDING_STEPS[2].options}
          />
          <PreferenceSelect
            label="Communication Style"
            value={communicationStyle}
            onChange={(v) => setCommunicationStyle(v as UserCommunicationStyle)}
            options={ONBOARDING_STEPS[3].options}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-contained rounded-full px-8 py-2.5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </section>
  );
}

/* ─── Preference Select ─── */

interface PreferenceSelectProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function PreferenceSelect({
  label,
  value,
  onChange,
  options,
}: PreferenceSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase opacity-50">
        {label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-lavenderHaze-200/30 bg-lavenderHaze-100/30 px-3 py-2 text-sm dark:border-nightIndigo-700 dark:bg-nightIndigo-900/50"
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
