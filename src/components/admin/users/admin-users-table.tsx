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
  const selectionResetKey = users.map((user) => user.id).join("|");

  return (
    <AdminUsersTableContent
      key={selectionResetKey}
      users={users}
      searchQuery={searchQuery}
      pagination={pagination}
    />
  );
}

function AdminUsersTableContent({
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-270 table-fixed border-collapse">
          <thead className="border-b border-slate-300 dark:border-slate-500">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                Username
              </th>
              <th scope="col" className="w-[16%] px-3 py-3">
                Email
              </th>
              <th scope="col" className="w-[8%] px-3 py-3">
                Role
              </th>
              <th scope="col" className="w-[8%] px-3 py-3">
                Plan
              </th>
              <th scope="col" className="w-[20%] px-3 py-3">
                Media Used
              </th>
              <th scope="col" className="w-[10%] px-3 py-3">
                Convos Today
              </th>
              <th scope="col" className="w-[10%] px-3 py-3">
                Registered
              </th>
              <th scope="col" className="w-[8%] px-3 py-3">
                State
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 dark:divide-slate-500">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600"
                >
                  No users matched this search.
                </td>
              </tr>
            ) : null}

            {users.map((user) => (
              <tr key={user.id} className="text-sm">
                <td className="px-4 py-4 align-middle">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      aria-label={`Select ${user.username}`}
                    />
                  </label>
                </td>
                <td className="px-3 py-4 align-middle">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium transition-all hover:underline"
                  >
                    {user.username}
                  </Link>
                </td>
                <td className="truncate px-3 py-4 align-middle">
                  {user.email}
                </td>
                <td className="px-3 py-4 align-middle capitalize">
                  {user.role}
                </td>
                <td className="px-3 py-4 align-middle">{user.planName}</td>
                <td className="truncate px-3 py-4 text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
                  {`${user.mediaUsage.images.used}/${formatLimit(user.mediaUsage.images.limit)} img | ${user.mediaUsage.audio.used}/${formatLimit(user.mediaUsage.audio.limit)} aud | ${user.mediaUsage.video.used}/${formatLimit(user.mediaUsage.video.limit)} vid`}
                </td>
                <td className="px-3 py-4 text-xs font-medium">
                  {`${user.conversationUsage.used}/${formatLimit(user.conversationUsage.limit)}`}
                </td>
                <td className="px-3 py-4">
                  {user.registerAt
                    ? new Date(user.registerAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-3 py-4">
                  {user.suspended ? "Suspended" : "Active"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
