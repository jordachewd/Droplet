import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { getAdminUsers } from "@/lib/utils/admin-queries";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const { q } = await searchParams;
  const users = await getAdminUsers(q);

  return (
    <section className="AdminUsersPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Users"
        subtitle="Search by username or email, then inspect account state, plan data, and usage."
      />

      <form
        className="flex flex-col gap-3 rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 p-4 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70 md:flex-row"
        method="get"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="font-medium">Search users</span>
          <input
            className="rounded-xl border border-lightBorders-400 bg-lightBackground-100 px-3 py-2 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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

      <AdminUsersTable users={users} />
    </section>
  );
}
