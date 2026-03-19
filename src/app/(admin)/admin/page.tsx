import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import { getAdminDashboardStats } from "@/lib/utils/admin-queries";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <section className="AdminDashboardPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Admin Dashboard"
        subtitle="Operational overview across users, conversations, billing, and usage telemetry."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="admin-surface transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="mb-2 flex items-center gap-2 text-sm opacity-70">
              <i className={stat.icon}></i>
              <span>{stat.label}</span>
            </p>
            <p className="heading-4">{stat.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
