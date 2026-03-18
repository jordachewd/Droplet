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
}

interface AdminUsersTableProps {
  users: AdminUsersTableItem[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

  return (
    <div className="AdminUsersTable overflow-hidden rounded-2xl border border-slate-300 bg-lavenderHaze-100/80 dark:border-slate-500 dark:bg-nightIndigo-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
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
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
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

      <div className="grid grid-cols-[0.35fr_1.2fr_1.5fr_0.7fr_0.7fr_0.8fr_0.7fr] gap-3 border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide opacity-70 dark:border-slate-500">
        <span></span>
        <span>Username</span>
        <span>Email</span>
        <span>Role</span>
        <span>Plan</span>
        <span>Registered</span>
        <span>State</span>
      </div>

      <div className="divide-y divide-slate-300 dark:divide-slate-500">
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-70">
            No users matched this search.
          </p>
        ) : null}

        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[0.35fr_1.2fr_1.5fr_0.7fr_0.7fr_0.8fr_0.7fr] gap-3 px-4 py-4 text-sm"
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
            <span>
              {user.registerAt
                ? new Date(user.registerAt).toLocaleDateString()
                : "-"}
            </span>
            <span>{user.suspended ? "Suspended" : "Active"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
