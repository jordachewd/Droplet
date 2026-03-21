/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";

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
  bulkRemoveUsersAction: vi.fn(),
  bulkSuspendUsersAction: vi.fn(),
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

const pageOneUsers = [
  {
    id: "user-page-1-a",
    username: "page-one-user-a",
    email: "page-one-a@example.com",
    role: "client",
    planName: "Lite",
    registerAt: "2026-03-01T00:00:00.000Z",
    suspended: false,
    mediaUsage: {
      images: { used: 1, limit: 3 },
      audio: { used: 0, limit: 3 },
      video: { used: 0, limit: 1 },
    },
    conversationUsage: { used: 2, limit: 5 },
  },
  {
    id: "user-page-1-b",
    username: "page-one-user-b",
    email: "page-one-b@example.com",
    role: "client",
    planName: "Lite",
    registerAt: "2026-03-02T00:00:00.000Z",
    suspended: false,
    mediaUsage: {
      images: { used: 0, limit: 3 },
      audio: { used: 1, limit: 3 },
      video: { used: 0, limit: 1 },
    },
    conversationUsage: { used: 1, limit: 5 },
  },
];

const pageTwoUsers = [
  {
    id: "user-page-2-a",
    username: "page-two-user-a",
    email: "page-two-a@example.com",
    role: "client",
    planName: "Pro",
    registerAt: "2026-03-03T00:00:00.000Z",
    suspended: false,
    mediaUsage: {
      images: { used: 2, limit: 10 },
      audio: { used: 2, limit: 10 },
      video: { used: 1, limit: 10 },
    },
    conversationUsage: { used: 4, limit: 20 },
  },
  {
    id: "user-page-2-b",
    username: "page-two-user-b",
    email: "page-two-b@example.com",
    role: "client",
    planName: "Pro",
    registerAt: "2026-03-04T00:00:00.000Z",
    suspended: true,
    mediaUsage: {
      images: { used: 0, limit: 10 },
      audio: { used: 0, limit: 10 },
      video: { used: 0, limit: 10 },
    },
    conversationUsage: { used: 0, limit: 20 },
  },
];

function getSelectAllCheckbox(): HTMLInputElement {
  return screen.getByLabelText("Select all users") as HTMLInputElement;
}

describe("AdminUsersTable", () => {
  it("clears selected rows when the users prop changes", () => {
    const { rerender } = render(
      <AdminUsersTable
        users={pageOneUsers}
        pagination={{ total: 4, page: 1, pageSize: 2, totalPages: 2 }}
      />,
    );

    fireEvent.click(getSelectAllCheckbox());

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(9);
    expect(getSelectAllCheckbox().checked).toBe(true);
    expect(screen.getByText("2 selected")).toBeTruthy();

    rerender(
      <AdminUsersTable
        users={pageTwoUsers}
        pagination={{ total: 4, page: 2, pageSize: 2, totalPages: 2 }}
      />,
    );

    expect(getSelectAllCheckbox().checked).toBe(false);
    expect(screen.queryByText("2 selected")).toBeNull();
    expect(
      (screen.getByLabelText("Select page-two-user-a") as HTMLInputElement)
        .checked,
    ).toBe(false);
    expect(
      (screen.getByLabelText("Select page-two-user-b") as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("sets allSelected to false after pagination data changes", () => {
    const { rerender } = render(
      <AdminUsersTable
        users={pageOneUsers}
        pagination={{ total: 4, page: 1, pageSize: 2, totalPages: 2 }}
      />,
    );

    fireEvent.click(getSelectAllCheckbox());
    expect(getSelectAllCheckbox().checked).toBe(true);

    rerender(
      <AdminUsersTable
        users={pageTwoUsers}
        pagination={{ total: 4, page: 2, pageSize: 2, totalPages: 2 }}
      />,
    );

    expect(getSelectAllCheckbox().checked).toBe(false);
    expect(screen.queryByText("Bulk Suspend")).toBeNull();
    expect(screen.queryByText("Bulk Remove")).toBeNull();
  });
});
