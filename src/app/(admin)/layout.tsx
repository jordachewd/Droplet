import AdminLayoutShell from "@/components/admin/admin-layout-shell";
import { requireAdminPageAccess } from "@/lib/utils/admin-auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPageAccess();

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
