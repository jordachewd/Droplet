import { notFound } from "next/navigation";
import PageHead from "@/components/layout/page-head";
import TiptapEditor from "@/components/admin/tiptap-editor";
import { savePublicPageAction } from "@/lib/actions/admin.actions";
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
    <section className="AdminWebsiteEditorPage mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHead
        title={`Edit ${page.title}`}
        subtitle="Update page copy and rich content, then persist the latest HTML output."
      />

      <form
        action={savePublicPageAction}
        className="flex flex-col gap-4 rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 p-5 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
      >
        <input type="hidden" name="pageId" value={page.id} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Title</span>
          <input
            className="rounded-xl border border-lightBorders-400 bg-white px-3 py-2 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            type="text"
            name="title"
            defaultValue={page.title}
            required
          />
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Slug
            </p>
            <p className="mt-1 text-sm">/{page.slug}</p>
          </div>
          <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Status
            </p>
            <p className="mt-1 text-sm">
              {page.isPublished ? "Published" : "Draft"}
            </p>
          </div>
          <div className="rounded-xl border border-lightBorders-300 px-4 py-3 dark:border-darkBorders-500">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Sort Order
            </p>
            <p className="mt-1 text-sm">{page.sortOrder}</p>
          </div>
        </div>

        <TiptapEditor inputName="content" initialContent={page.content} />

        <div className="flex justify-end">
          <button className="btn btn-md btn-contained" type="submit">
            Save Page
          </button>
        </div>
      </form>
    </section>
  );
}
