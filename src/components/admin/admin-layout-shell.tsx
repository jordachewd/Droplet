import Link from "next/link";
import AdminSidebar from "@/components/admin/admin-sidebar";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export default function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  return (
    <section className="AdminLayoutShell flex min-h-dvh w-full">
      <AdminSidebar />

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="AdminLayoutHeader flex items-center justify-between border-b border-lightBorders-300 bg-white/70 px-4 py-4 backdrop-blur dark:border-darkBorders-500 dark:bg-jwdMarine-950/70 md:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-60">
              Operations
            </p>
            <h1 className="heading-5">Droplet Admin</h1>
          </div>

          <Link className="btn btn-sm btn-outlined" href="/app">
            Open App
          </Link>
        </header>

        <main className="AdminLayoutMain droplet-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </section>
  );
}
