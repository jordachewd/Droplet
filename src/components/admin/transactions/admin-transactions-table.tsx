"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bulkDeleteTransactionsAction } from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";

interface AdminTransactionsTableItem {
  id: string;
  username: string;
  email: string;
  plan: string;
  amount: number;
  billing: string;
  createdAt: string | null;
  status: string;
}

interface AdminTransactionsPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AdminTransactionsTableProps {
  transactions: AdminTransactionsTableItem[];
  currencySymbol: string;
  pagination: AdminTransactionsPagination;
}

export function AdminTransactionsTable({
  transactions,
  currencySymbol,
  pagination,
}: AdminTransactionsTableProps) {
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);

  const selectedSet = useMemo(
    () => new Set(selectedTransactionIds),
    [selectedTransactionIds],
  );
  const allSelected =
    transactions.length > 0 &&
    selectedTransactionIds.length === transactions.length;

  const handleToggleTransaction = (transactionId: string) => {
    setSelectedTransactionIds((current) =>
      current.includes(transactionId)
        ? current.filter((value) => value !== transactionId)
        : [...current, transactionId],
    );
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedTransactionIds([]);
      return;
    }

    setSelectedTransactionIds(
      transactions.map((transaction) => transaction.id),
    );
  };

  const buildPageHref = (nextPage: number) =>
    `/admin/transactions?page=${nextPage}`;

  return (
    <div className="AdminTransactionsTable admin-table-shell">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            aria-label="Select all transactions"
          />
          Select All
        </label>

        {selectedTransactionIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              {selectedTransactionIds.length} selected
            </span>
            <AdminManagedForm
              action={bulkDeleteTransactionsAction}
              className="inline-flex"
              confirmMessage="Are you sure you want to remove all selected transactions? This action cannot be undone."
            >
              {selectedTransactionIds.map((transactionId) => (
                <input
                  key={`transaction-${transactionId}`}
                  type="hidden"
                  name="transactionIds"
                  value={transactionId}
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

      <div className="grid grid-cols-[0.35fr_1fr_1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:border-slate-500 dark:text-lavenderHaze-700">
        <span></span>
        <span>User</span>
        <span>Email</span>
        <span>Plan</span>
        <span>Amount</span>
        <span>Date</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-slate-300 dark:divide-slate-500">
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
            No transactions recorded yet.
          </p>
        ) : null}

        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="grid grid-cols-[0.35fr_1fr_1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm"
          >
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedSet.has(transaction.id)}
                onChange={() => handleToggleTransaction(transaction.id)}
                aria-label={`Select transaction ${transaction.id}`}
              />
            </label>
            <Link
              href={`/admin/transactions/${transaction.id}`}
              className="font-medium transition-all hover:underline"
            >
              {transaction.username}
            </Link>
            <span className="truncate">{transaction.email}</span>
            <span>{transaction.plan}</span>
            <span>
              {currencySymbol}
              {transaction.amount} /{" "}
              {transaction.billing === "Monthly" ? "Mo" : "Yr"}
            </span>
            <span>
              {transaction.createdAt
                ? new Date(transaction.createdAt).toLocaleDateString()
                : "-"}
            </span>
            <span>{transaction.status}</span>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <nav
          aria-label="Transactions pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 px-4 py-3 dark:border-slate-500"
        >
          <p className="text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
            Page {pagination.page} of {pagination.totalPages} -{" "}
            {pagination.total} transactions
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
