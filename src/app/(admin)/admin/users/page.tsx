import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { getAdminUsers } from "@/lib/utils/admin-queries";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

function parsePositivePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const { q, page } = await searchParams;
  const usersResponse = await getAdminUsers(q, parsePositivePage(page));

  return (
    <section className="AdminUsersPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Users"
        subtitle="Search by username or email, then inspect account state, plan data, and usage."
      />

      <form
        className="admin-surface-subtle flex flex-col gap-3 md:flex-row"
        method="get"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="font-medium">Search users</span>
          <input
            className="rounded-xl border border-slate-400 bg-lavenderHaze-100 px-3 py-2 dark:border-slate-500 dark:bg-nightIndigo-1000"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="username or email"
          />
        </label>
        <div className="flex items-end gap-3">
          <button className="btn btn-md btn-contained" type="submit">
            Search
          </button>
          <Link className="btn btn-md btn-outlined" href="/admin/users">
            Reset
          </Link>
        </div>
      </form>

      <AdminUsersTable
        users={usersResponse.items}
        searchQuery={q}
        pagination={{
          total: usersResponse.total,
          page: usersResponse.page,
          pageSize: usersResponse.pageSize,
          totalPages: usersResponse.totalPages,
        }}
      />
    </section>
  );
}
