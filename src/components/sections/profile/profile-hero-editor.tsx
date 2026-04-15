"use client";

import classNames from "classnames";
import { updateUser } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadRouteResponse } from "@/types/UploadData.d";
import Button from "@/components/shared/button";
import FormInput from "@/components/shared/form-input";

type ProfileActionResponse = {
  status?: number;
  message?: string;
};

interface ProfileHeroEditorProps {
  userData: UserData;
}

export default function ProfileHeroEditor({
  userData,
}: ProfileHeroEditorProps) {
  const router = useRouter();
  const [firstNameInput, setFirstNameInput] = useState<string>(
    userData.firstName ?? "",
  );
  const [lastNameInput, setLastNameInput] = useState<string>(
    userData.lastName ?? "",
  );
  const [emailInput, setEmailInput] = useState<string>(userData.email);
  const [avatarUrl, setAvatarUrl] = useState<string>(userData.userimg ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const displayAvatarUrl = avatarPreviewUrl ?? avatarUrl;

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setAvatarFile(selectedFile);
    setErrorMessage(null);
    setFeedbackMessage(null);
  }

  async function uploadAvatar(selectedFile: File): Promise<string> {
    const formData = new FormData();
    formData.set("file", selectedFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response
      .json()
      .catch(() => null)) as UploadRouteResponse | null;

    if (!response.ok || !payload?.fileUrl) {
      throw new Error(
        payload?.error || payload?.message || "Failed to upload avatar image.",
      );
    }

    return payload.fileUrl;
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const normalizedEmail = emailInput.trim();
    if (!normalizedEmail) {
      setErrorMessage("Email address is required.");
      setFeedbackMessage(null);
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      let nextAvatarUrl = avatarUrl;

      if (avatarFile) {
        nextAvatarUrl = await uploadAvatar(avatarFile);
      }

      const updateResult = (await updateUser(userData.clerkId, {
        firstName: firstNameInput.trim(),
        lastName: lastNameInput.trim(),
        email: normalizedEmail,
        userimg: nextAvatarUrl,
        updatedAt: new Date(),
      })) as ProfileActionResponse | undefined;

      if (updateResult?.status !== 200) {
        throw new Error(updateResult?.message || "Failed to update profile.");
      }

      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      setFeedbackMessage("Profile updated successfully.");
      router.refresh();
    } catch (error) {
      void error;
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="ProfileHero mx-auto flex w-full max-w-7xl px-4">
      <form
        className={classNames(
          "ProfileHeroEditor flex w-full flex-col gap-4 rounded-lg p-6 shadow-sm",
          "bg-lavenderHaze-100/80 dark:bg-nightIndigo-1000/80",
        )}
        onSubmit={(event) => void handleSaveProfile(event)}
      >
        <h3 className="heading-5">Edit account details</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            type="text"
            label="First name"
            value={firstNameInput}
            onChange={(event) => setFirstNameInput(event.target.value)}
            autoComplete="given-name"
          />

          <FormInput
            type="text"
            label="Last name"
            value={lastNameInput}
            onChange={(event) => setLastNameInput(event.target.value)}
            autoComplete="family-name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            type="email"
            label="Email address"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            autoComplete="email"
            required
            aria-required="true"
          />

          <FormInput
            type="text"
            label="Username"
            value={userData.username}
            disabled
            aria-disabled="true"
            helperText="Username cannot be changed"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-lavenderHaze-500 text-sm font-semibold text-white dark:bg-nightIndigo-500">
            {displayAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatarUrl}
                alt="Profile avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              "IMG"
            )}
          </div>

          <FormInput
            type="file"
            label="Avatar image"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </div>

        {feedbackMessage && (
          <p
            aria-live="polite"
            className="text-sm text-emerald-700 dark:text-emerald-300"
          >
            {feedbackMessage}
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
        )}
      </form>
    </section>
  );
}
