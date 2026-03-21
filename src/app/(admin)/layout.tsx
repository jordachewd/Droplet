import AdminLayoutShell from "@/components/admin/admin-layout-shell";
import { requireAdminPageAccess } from "@/lib/utils/admin-auth";
import { ADMIN_LINKS } from "@/constants/admin";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPageAccess();

  return (
    <>
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>
      <AdminLayoutShell adminLinks={ADMIN_LINKS}>{children}</AdminLayoutShell>
    </>
  );
}
