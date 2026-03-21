"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  bulkRemoveUsersAction,
  bulkSuspendUsersAction,
} from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";

interface AdminUsersTableItem {
  id: string;
  username: string;
  email: string;
  role: string;
  planName: string;
  registerAt: string | null;
  suspended: boolean;
  mediaUsage: {
    images: {
      used: number;
      limit: number;
    };
    audio: {
      used: number;
      limit: number;
    };
    video: {
      used: number;
      limit: number;
    };
  };
  conversationUsage: {
    used: number;
    limit: number;
  };
}

interface AdminUsersPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AdminUsersTableProps {
  users: AdminUsersTableItem[];
  searchQuery?: string;
  pagination: AdminUsersPagination;
}

export function AdminUsersTable({
  users,
  searchQuery,
  pagination,
}: AdminUsersTableProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const trimmedSearchQuery = searchQuery?.trim() ?? "";

  const formatLimit = (limit: number) =>
    limit === -1 ? "Unlimited" : String(limit);

  const selectedSet = useMemo(
    () => new Set(selectedUserIds),
    [selectedUserIds],
  );
  const allSelected =
    users.length > 0 && selectedUserIds.length === users.length;

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    );
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedUserIds([]);
      return;
    }

    setSelectedUserIds(users.map((user) => user.id));
  };

  const buildPageHref = (nextPage: number) => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(nextPage));

    if (trimmedSearchQuery.length > 0) {
      searchParams.set("q", trimmedSearchQuery);
    }

    return `/admin/users?${searchParams.toString()}`;
  };

  return (
    <div className="AdminUsersTable admin-table-shell">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            aria-label="Select all users"
          />
          Select All
        </label>

        {selectedUserIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              {selectedUserIds.length} selected
            </span>

            <AdminManagedForm
              action={bulkSuspendUsersAction}
              className="inline-flex"
              confirmMessage="Are you sure you want to suspend all selected users?"
            >
              {selectedUserIds.map((userId) => (
                <input
                  key={`suspend-${userId}`}
                  type="hidden"
                  name="userIds"
                  value={userId}
                />
              ))}
              <AdminFormSubmitButton
                className="btn btn-sm btn-outlined"
                label="Bulk Suspend"
                pendingLabel="Suspending..."
              />
            </AdminManagedForm>

            <AdminManagedForm
              action={bulkRemoveUsersAction}
              className="inline-flex"
              confirmMessage="Are you sure you want to permanently remove all selected users? This will delete all conversations, transactions, and uploaded files for those accounts. This action cannot be undone."
            >
              {selectedUserIds.map((userId) => (
                <input
                  key={`remove-${userId}`}
                  type="hidden"
                  name="userIds"
                  value={userId}
                />
              ))}
              <AdminFormSubmitButton
                className="btn btn-sm btn-contained bg-red-700 text-white hover:bg-red-800"
                label="Bulk Remove"
                pendingLabel="Removing..."
              />
            </AdminManagedForm>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-[0.35fr_1.05fr_1.35fr_0.6fr_0.6fr_1.25fr_0.7fr_0.8fr_0.7fr] gap-3 border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:border-slate-500 dark:text-lavenderHaze-700">
        <span></span>
        <span>Username</span>
        <span>Email</span>
        <span>Role</span>
        <span>Plan</span>
        <span>Media Used</span>
        <span>Convos Today</span>
        <span>Registered</span>
        <span>State</span>
      </div>

      <div className="divide-y divide-slate-300 dark:divide-slate-500">
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
            No users matched this search.
          </p>
        ) : null}

        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[0.35fr_1.05fr_1.35fr_0.6fr_0.6fr_1.25fr_0.7fr_0.8fr_0.7fr] gap-3 px-4 py-4 text-sm"
          >
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedSet.has(user.id)}
                onChange={() => handleToggleUser(user.id)}
                aria-label={`Select ${user.username}`}
              />
            </label>
            <Link
              href={`/admin/users/${user.id}`}
              className="font-medium transition-all hover:underline"
            >
              {user.username}
            </Link>
            <span className="truncate">{user.email}</span>
            <span className="capitalize">{user.role}</span>
            <span>{user.planName}</span>
            <span className="truncate text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
              {`${user.mediaUsage.images.used}/${formatLimit(user.mediaUsage.images.limit)} img | ${user.mediaUsage.audio.used}/${formatLimit(user.mediaUsage.audio.limit)} aud | ${user.mediaUsage.video.used}/${formatLimit(user.mediaUsage.video.limit)} vid`}
            </span>
            <span className="text-xs font-medium">
              {`${user.conversationUsage.used}/${formatLimit(user.conversationUsage.limit)}`}
            </span>
            <span>
              {user.registerAt
                ? new Date(user.registerAt).toLocaleDateString()
                : "-"}
            </span>
            <span>{user.suspended ? "Suspended" : "Active"}</span>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <nav
          aria-label="Users pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 px-4 py-3 dark:border-slate-500"
        >
          <p className="text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
            Page {pagination.page} of {pagination.totalPages} -{" "}
            {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            {pagination.page > 1 ? (
              <Link
                href={buildPageHref(pagination.page - 1)}
                className="btn btn-sm btn-outlined"
              >
                Previous
              </Link>
            ) : (
              <span
                className="btn btn-sm btn-outlined cursor-not-allowed opacity-50"
                aria-hidden
              >
                Previous
              </span>
            )}
            {pagination.page < pagination.totalPages ? (
              <Link
                href={buildPageHref(pagination.page + 1)}
                className="btn btn-sm btn-outlined"
              >
                Next
              </Link>
            ) : (
              <span
                className="btn btn-sm btn-outlined cursor-not-allowed opacity-50"
                aria-hidden
              >
                Next
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
