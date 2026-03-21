/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminTransactionsTable } from "@/components/admin/transactions/admin-transactions-table";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/actions/admin.actions", () => ({
  bulkDeleteTransactionsAction: vi.fn(),
}));

vi.mock("@/components/admin/admin-managed-form", () => ({
  AdminManagedForm: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <form className={className}>{children}</form>,
}));

vi.mock("@/components/admin/admin-form-submit-button", () => ({
  AdminFormSubmitButton: ({
    label,
    className,
  }: {
    label: string;
    className?: string;
  }) => (
    <button className={className} type="submit">
      {label}
    </button>
  ),
}));

const pageOneTransactions = [
  {
    id: "txn-page-1-a",
    username: "user-a",
    email: "user-a@example.com",
    plan: "Lite",
    amount: 0,
    billing: "Monthly",
    createdAt: "2026-03-10T00:00:00.000Z",
    status: "succeeded",
  },
  {
    id: "txn-page-1-b",
    username: "user-b",
    email: "user-b@example.com",
    plan: "Pro",
    amount: 19,
    billing: "Monthly",
    createdAt: "2026-03-11T00:00:00.000Z",
    status: "succeeded",
  },
];

const pageTwoTransactions = [
  {
    id: "txn-page-2-a",
    username: "user-c",
    email: "user-c@example.com",
    plan: "Premium",
    amount: 39,
    billing: "Monthly",
    createdAt: "2026-03-12T00:00:00.000Z",
    status: "succeeded",
  },
  {
    id: "txn-page-2-b",
    username: "user-d",
    email: "user-d@example.com",
    plan: "Pro",
    amount: 19,
    billing: "Yearly",
    createdAt: "2026-03-13T00:00:00.000Z",
    status: "succeeded",
  },
];

function getSelectAllCheckbox(): HTMLInputElement {
  return screen.getByLabelText("Select all transactions") as HTMLInputElement;
}

describe("AdminTransactionsTable", () => {
  it("clears selected rows when the transactions prop changes", () => {
    const { rerender } = render(
      <AdminTransactionsTable
        transactions={pageOneTransactions}
        currencySymbol="$"
        pagination={{ total: 4, page: 1, pageSize: 2, totalPages: 2 }}
      />,
    );

    fireEvent.click(getSelectAllCheckbox());

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(getSelectAllCheckbox().checked).toBe(true);
    expect(screen.getByText("2 selected")).toBeTruthy();

    rerender(
      <AdminTransactionsTable
        transactions={pageTwoTransactions}
        currencySymbol="$"
        pagination={{ total: 4, page: 2, pageSize: 2, totalPages: 2 }}
      />,
    );

    expect(getSelectAllCheckbox().checked).toBe(false);
    expect(screen.queryByText("2 selected")).toBeNull();
    expect(
      (
        screen.getByLabelText(
          "Select transaction txn-page-2-a",
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(
      (
        screen.getByLabelText(
          "Select transaction txn-page-2-b",
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("sets allSelected to false after pagination data changes", () => {
    const { rerender } = render(
      <AdminTransactionsTable
        transactions={pageOneTransactions}
        currencySymbol="$"
        pagination={{ total: 4, page: 1, pageSize: 2, totalPages: 2 }}
      />,
    );

    fireEvent.click(getSelectAllCheckbox());
    expect(getSelectAllCheckbox().checked).toBe(true);

    rerender(
      <AdminTransactionsTable
        transactions={pageTwoTransactions}
        currencySymbol="$"
        pagination={{ total: 4, page: 2, pageSize: 2, totalPages: 2 }}
      />,
    );

    expect(getSelectAllCheckbox().checked).toBe(false);
    expect(screen.queryByText("Bulk Remove")).toBeNull();
  });
});
