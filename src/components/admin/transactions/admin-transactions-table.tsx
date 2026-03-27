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
  const transactionIdSet = useMemo(
    () => new Set(transactions.map((transaction) => transaction.id)),
    [transactions],
  );
  const visibleSelectedTransactionIds = useMemo(
    () =>
      selectedTransactionIds.filter((transactionId) =>
        transactionIdSet.has(transactionId),
      ),
    [selectedTransactionIds, transactionIdSet],
  );

  const selectedSet = useMemo(
    () => new Set(visibleSelectedTransactionIds),
    [visibleSelectedTransactionIds],
  );
  const allSelected =
    transactions.length > 0 &&
    visibleSelectedTransactionIds.length === transactions.length;

  const handleToggleTransaction = (transactionId: string) => {
    setSelectedTransactionIds((current) => {
      const normalizedCurrent = current.filter((value) =>
        transactionIdSet.has(value),
      );

      return normalizedCurrent.includes(transactionId)
        ? normalizedCurrent.filter((value) => value !== transactionId)
        : [...normalizedCurrent, transactionId];
    });
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

        {visibleSelectedTransactionIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              {visibleSelectedTransactionIds.length} selected
            </span>
            <AdminManagedForm
              action={bulkDeleteTransactionsAction}
              className="inline-flex"
              confirmMessage="Are you sure you want to remove all selected transactions? This action cannot be undone."
            >
              {visibleSelectedTransactionIds.map((transactionId) => (
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed border-collapse">
          <thead className="border-b border-slate-300 dark:border-slate-500">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className="w-[18%] px-3 py-3">
                User
              </th>
              <th scope="col" className="w-[24%] px-3 py-3">
                Email
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                Plan
              </th>
              <th scope="col" className="w-[16%] px-3 py-3">
                Amount
              </th>
              <th scope="col" className="w-[14%] px-3 py-3">
                Date
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 dark:divide-slate-500">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600"
                >
                  No transactions recorded yet.
                </td>
              </tr>
            ) : null}

            {transactions.map((transaction) => (
              <tr key={transaction.id} className="text-sm">
                <td className="px-4 py-4 align-middle">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(transaction.id)}
                      onChange={() => handleToggleTransaction(transaction.id)}
                      aria-label={`Select transaction ${transaction.id}`}
                    />
                  </label>
                </td>
                <td className="px-3 py-4 align-middle">
                  <Link
                    href={`/admin/transactions/${transaction.id}`}
                    className="font-medium transition-all hover:underline"
                  >
                    {transaction.username}
                  </Link>
                </td>
                <td className="truncate px-3 py-4 align-middle">
                  {transaction.email}
                </td>
                <td className="px-3 py-4 align-middle">{transaction.plan}</td>
                <td className="px-3 py-4 align-middle">
                  {currencySymbol}
                  {transaction.amount} /{" "}
                  {transaction.billing === "Monthly" ? "Mo" : "Yr"}
                </td>
                <td className="px-3 py-4 align-middle">
                  {transaction.createdAt
                    ? new Date(transaction.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-3 py-4 align-middle">{transaction.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
