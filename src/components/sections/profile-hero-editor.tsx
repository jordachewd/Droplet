"use client";

import classNames from "classnames";
import { deleteUser, updateUser } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { UploadRouteResponse } from "@/types/UploadData.d";
import ConfirmationModal from "@/components/shared/confirmation-modal";

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
  const clerk = useClerk();
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
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);
  const displayAvatarUrl = avatarPreviewUrl ?? avatarUrl;

  const profileInputClass = classNames(
    "w-full rounded-md border px-3 py-2 text-sm",
    "border-slate-500 bg-lavenderHaze-100 text-midnightBlue-900",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
    "dark:border-slate-500 dark:bg-nightIndigo-900 dark:text-white dark:focus-visible:ring-nightIndigo-500/40",
  );

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
    if (isSaving || isDeleting) {
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
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (isDeleting || isSaving) {
      return;
    }

    setIsDeleting(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const deleteResult = (await deleteUser(
        userData.clerkId,
      )) as ProfileActionResponse | null;

      if (!deleteResult || deleteResult.status !== 200) {
        throw new Error(deleteResult?.message || "Failed to delete account.");
      }

      await clerk.signOut({ redirectUrl: "/" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete account.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <form
        className={classNames(
          "ProfileHeroEditor flex w-full flex-col gap-4 rounded-lg border p-6 shadow-md",
          "border-slate-500 bg-lavenderHaze-100/80",
          "dark:border-slate-500 dark:bg-nightIndigo-1000/80",
        )}
        onSubmit={(event) => void handleSaveProfile(event)}
      >
        <h3 className="heading-5">Edit account details</h3>

        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-lavenderHaze-500 text-sm font-semibold text-white dark:bg-nightIndigo-500">
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
          </span>
          <div className="text-xs opacity-80">
            Uploading a new image updates your profile avatar URL.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">First name</span>
            <input
              type="text"
              value={firstNameInput}
              onChange={(event) => setFirstNameInput(event.target.value)}
              className={profileInputClass}
              maxLength={120}
              autoComplete="given-name"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Last name</span>
            <input
              type="text"
              value={lastNameInput}
              onChange={(event) => setLastNameInput(event.target.value)}
              className={profileInputClass}
              maxLength={120}
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Email address</span>
          <input
            type="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            className={profileInputClass}
            autoComplete="email"
            required
            aria-required="true"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Avatar image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className={classNames(
              "block w-full cursor-pointer text-sm",
              "file:mr-4 file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium",
              "file:border-slate-500 file:bg-lavenderHaze-300/40 file:text-midnightBlue-900",
              "dark:file:border-slate-500 dark:file:bg-nightIndigo-500/30 dark:file:text-white",
            )}
          />
        </label>

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

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className={classNames(
              "inline-flex min-w-36 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
              "bg-lavenderHaze-500 text-white transition hover:opacity-90",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
          <span className="text-xs opacity-80">
            Email updates are applied to your Droplet profile.
          </span>
        </div>
      </form>

      <div
        className={classNames(
          "ProfileHeroDangerZone rounded-lg border border-red-300 bg-red-50 p-6",
          "dark:border-red-800 dark:bg-red-950/40",
        )}
      >
        <h3 className="heading-5 text-red-700 dark:text-red-300">
          Danger zone
        </h3>
        <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">
          Deleting your account permanently removes your profile, conversations,
          transactions, and uploaded assets.
        </p>
        <button
          type="button"
          className={classNames(
            "mt-4 inline-flex min-w-40 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
            "bg-red-600 text-white transition hover:bg-red-500",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          onClick={() => setIsDeleteConfirmOpen(true)}
          disabled={isDeleting || isSaving}
        >
          {isDeleting ? "Deleting..." : "Delete My Account"}
        </button>
      </div>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title="Delete account"
        description="Delete your account and all associated conversations, transactions, and uploaded files? This cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          void handleDeleteAccount();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
}
