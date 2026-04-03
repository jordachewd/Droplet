"use client";

import classNames from "classnames";
import { deleteUser } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import ConfirmationModal from "@/components/shared/confirmation-modal";

type ProfileActionResponse = {
  status?: number;
  message?: string;
};

interface ProfileDangerZoneProps {
  userData: UserData;
}

export default function ProfileDangerZone({
  userData,
}: ProfileDangerZoneProps) {
  const clerk = useClerk();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (userData.role === "admin") {
    return null;
  }

  async function handleDeleteAccount() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
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
      void error;
      setErrorMessage("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="ProfileDangerZone mx-auto flex w-full max-w-7xl px-4 pb-8">
        <div
          className={classNames(
            "w-full rounded-lg border border-red-300 bg-red-50 p-6",
            "dark:border-red-800 dark:bg-red-950/40",
          )}
        >
          <h3 className="heading-5 text-red-700 dark:text-red-300">
            Danger zone
          </h3>
          <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">
            Deleting your account permanently removes your profile,
            conversations, transactions, and uploaded assets.
          </p>
          <button
            type="button"
            className={classNames(
              "mt-4 inline-flex min-w-40 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold",
              "bg-red-600 text-white transition hover:bg-red-500",
              "disabled:cursor-not-allowed disabled:bg-red-800 disabled:text-red-200",
            )}
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete My Account"}
          </button>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-700 dark:text-red-300"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </section>

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
