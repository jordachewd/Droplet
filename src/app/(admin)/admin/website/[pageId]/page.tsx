import { notFound } from "next/navigation";
import PageHead from "@/components/layout/PageHead";
import TiptapEditor from "@/components/admin/tiptap-editor";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import FormInput from "@/components/shared/form-input";
import { savePublicPageAction } from "@/lib/actions/admin-pages.actions";
import { getAdminPublicPage } from "@/lib/utils/admin-queries";

interface AdminWebsiteEditorPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function AdminWebsiteEditorPage({
  params,
}: AdminWebsiteEditorPageProps) {
  const { pageId } = await params;
  const page = await getAdminPublicPage(pageId);

  if (!page) {
    notFound();
  }

  return (
    <section className="AdminWebsiteEditorPage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        id="admin-website-editor-head"
        title={`Edit ${page.title}`}
        subtitle="Update page copy and rich content, then persist the latest HTML output."
      />

      <AdminManagedForm
        action={savePublicPageAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="pageId" value={page.id} />

        <FormInput
          type="text"
          name="title"
          label="Title"
          defaultValue={page.title}
          required
          aria-required="true"
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="admin-surface-subtle">
            <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              Slug
            </p>
            <p className="mt-1 text-sm">/{page.slug}</p>
          </div>
          <div className="admin-surface-subtle">
            <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              Status
            </p>
            <p className="mt-1 text-sm">
              {page.isPublished ? "Published" : "Draft"}
            </p>
          </div>
          <div className="admin-surface-subtle">
            <p className="text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
              Sort Order
            </p>
            <p className="mt-1 text-sm">{page.sortOrder}</p>
          </div>
        </div>

        <TiptapEditor inputName="content" initialContent={page.content} />

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save Page"
            pendingLabel="Saving page..."
          />
        </div>
      </AdminManagedForm>
    </section>
  );
}
