import Link from "next/link";
import PageHead from "@/components/layout/page-head";
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
        className="flex flex-col gap-3 rounded-2xl border border-lightBorders-300 bg-white/70 p-4 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70 md:flex-row"
        method="get"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="font-medium">Search users</span>
          <input
            className="rounded-xl border border-lightBorders-400 bg-white px-3 py-2 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
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

      <div className="overflow-hidden rounded-2xl border border-lightBorders-300 bg-white/70 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
        <div className="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.7fr_0.9fr_0.8fr] gap-3 border-b border-lightBorders-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide opacity-70 dark:border-darkBorders-500">
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span>Plan</span>
          <span>Registered</span>
          <span>State</span>
        </div>

        <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
          {users.length === 0 && (
            <p className="px-4 py-6 text-sm opacity-70">
              No users matched this search.
            </p>
          )}

          {users.map((user) => (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.7fr_0.9fr_0.8fr] gap-3 px-4 py-4 text-sm transition-all hover:bg-lightSecondary-300/50 dark:hover:bg-darkSecondary-500/20"
            >
              <span className="font-medium">{user.username}</span>
              <span className="truncate">{user.email}</span>
              <span className="capitalize">{user.role}</span>
              <span>{user.planName}</span>
              <span>
                {user.registerAt
                  ? new Date(user.registerAt).toLocaleDateString()
                  : "-"}
              </span>
              <span>{user.suspended ? "Suspended" : "Active"}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
