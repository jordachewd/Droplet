"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { ModelSettingsFormValue } from "@/types/AdminData.d";
import {
  AUDIO_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
} from "@/constants/admin-options";

interface AdminModelsSectionProps {
  modelValue: ModelSettingsFormValue;
}

export function AdminModelsSection({ modelValue }: AdminModelsSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="rounded-2xl border border-slate-300 bg-lightBackground-100/80 p-5 dark:border-slate-500 dark:bg-darkBackground-900/70"
    >
      <input type="hidden" name="key" value="admin.models" />
      <input type="hidden" name="category" value="models" />
      <h2 className="heading-6 mb-2">AI Models</h2>
      <p className="mb-4 text-sm opacity-70">
        Choose model defaults by plan and media type.
      </p>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Lite Chat Model</span>
          <select
            name="liteChatModel"
            defaultValue={modelValue.liteChatModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {CHAT_MODEL_OPTIONS.map((modelId) => (
              <option key={`lite-chat-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Pro Chat Model</span>
          <select
            name="proChatModel"
            defaultValue={modelValue.proChatModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {CHAT_MODEL_OPTIONS.map((modelId) => (
              <option key={`pro-chat-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Premium Chat Model</span>
          <select
            name="premiumChatModel"
            defaultValue={modelValue.premiumChatModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {CHAT_MODEL_OPTIONS.map((modelId) => (
              <option key={`premium-chat-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Default Image Model</span>
          <select
            name="imageModel"
            defaultValue={modelValue.imageModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {IMAGE_MODEL_OPTIONS.map((modelId) => (
              <option key={`image-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Default Audio Model</span>
          <select
            name="audioModel"
            defaultValue={modelValue.audioModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {AUDIO_MODEL_OPTIONS.map((modelId) => (
              <option key={`audio-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Default Video Model</span>
          <select
            name="videoModel"
            defaultValue={modelValue.videoModel}
            className="w-full rounded-lg border border-slate-400 bg-lightBackground-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-darkBackground-1000"
          >
            {VIDEO_MODEL_OPTIONS.map((modelId) => (
              <option key={`video-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <AdminFormSubmitButton
          className="btn btn-md btn-contained"
          label="Save Models"
          pendingLabel="Saving models..."
        />
      </div>
    </AdminManagedForm>
  );
}
