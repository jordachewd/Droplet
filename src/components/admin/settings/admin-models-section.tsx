"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { ModelSettingsFormValue } from "@/types/AdminData.d";

interface AdminModelOptions {
  chat: string[];
  image: string[];
  audio: string[];
}

interface AdminModelsSectionProps {
  modelValue: ModelSettingsFormValue;
  modelOptions: AdminModelOptions;
}

export function AdminModelsSection({
  modelValue,
  modelOptions,
}: AdminModelsSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="admin-surface"
    >
      <input type="hidden" name="key" value="admin.models" />
      <input type="hidden" name="category" value="models" />
      <h2 className="heading-6 mb-2">AI Models</h2>
      <p className="mb-4 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
        Choose model defaults by plan and media type.
      </p>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Lite Chat Model</span>
          <select
            name="liteChatModel"
            defaultValue={modelValue.liteChatModel}
            className="form-select-input"
          >
            {modelOptions.chat.map((modelId) => (
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
            className="form-select-input"
          >
            {modelOptions.chat.map((modelId) => (
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
            className="form-select-input"
          >
            {modelOptions.chat.map((modelId) => (
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
            className="form-select-input"
          >
            {modelOptions.image.map((modelId) => (
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
            className="form-select-input"
          >
            {modelOptions.audio.map((modelId) => (
              <option key={`audio-${modelId}`} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <AdminFormSubmitButton
          label="Save Models"
          pendingLabel="Saving models..."
        />
      </div>
    </AdminManagedForm>
  );
}
