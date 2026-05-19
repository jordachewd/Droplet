import Link from "next/link";
import Button from "@/components/shared/button";
import FormInput from "@/components/shared/form-input";
import PageHead from "@/components/layout/PageHead";
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
        id="admin-users-head"
        title="Users"
        subtitle="Search by username or email, then inspect account state, plan data, and usage."
      />

      <form
        className="admin-surface-subtle flex flex-col gap-3 md:flex-row"
        method="get"
      >
        <FormInput
          type="search"
          name="q"
          label="Search users"
          defaultValue={q}
          placeholder="username or email"
          containerClassName="flex-1"
        />
        <div className="flex items-end gap-3">
          <Button size="xs" variant="contained" type="submit">
            Search
          </Button>

          <Link className="btn btn-xs btn-outlined" href="/admin/users">
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
