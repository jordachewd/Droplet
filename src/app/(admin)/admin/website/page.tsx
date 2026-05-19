import PageHead from "@/components/layout/PageHead";
import { AdminWebsiteManager } from "@/components/admin/website/admin-website-manager";
import { getAdminWebsitePages } from "@/lib/utils/admin-queries";

export default async function AdminWebsitePage() {
  const pages = await getAdminWebsitePages();

  return (
    <section className="AdminWebsitePage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        id="admin-website-head"
        title="Website"
        subtitle="Create, publish, order, and edit public pages without leaving the admin area."
      />

      <AdminWebsiteManager pages={pages} />
    </section>
  );
}
