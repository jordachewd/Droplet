import AdminLayoutShell from "@/components/admin/admin-layout-shell";
import { requireAdminPageAccess } from "@/lib/utils/admin-auth";
import { ADMIN_LINKS } from "@/constants/admin";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPageAccess();

  return (
    <AdminLayoutShell adminLinks={ADMIN_LINKS}>{children}</AdminLayoutShell>
  );
}

