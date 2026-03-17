import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import {
  createPublicPageAction,
  deletePublicPageAction,
  togglePublicPagePublishedAction,
  updatePublicPageSortOrderAction,
} from "@/lib/actions/admin.actions";
import { getAdminWebsitePages } from "@/lib/utils/admin-queries";

export default async function AdminWebsitePage() {
  const pages = await getAdminWebsitePages();

  return (
    <section className="AdminWebsitePage mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHead
        title="Website"
        subtitle="Create, publish, order, and edit public pages without leaving the admin area."
      />

      <form
        action={createPublicPageAction}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 p-4 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Title</span>
          <input
            className="rounded-xl border border-lightBorders-400 bg-white px-3 py-2 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            type="text"
            name="title"
            placeholder="About Droplet"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Slug</span>
          <input
            className="rounded-xl border border-lightBorders-400 bg-white px-3 py-2 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
            type="text"
            name="slug"
            placeholder="about"
            required
          />
        </label>
        <div className="flex items-end">
          <button className="btn btn-md btn-contained" type="submit">
            Create Page
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-lightBorders-300 bg-lightBackground-100/80 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70">
        <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1.1fr] gap-3 border-b border-lightBorders-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide opacity-70 dark:border-darkBorders-500">
          <span>Title</span>
          <span>Slug</span>
          <span>Status</span>
          <span>Sort</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-lightBorders-300 dark:divide-darkBorders-500">
          {pages.length === 0 && (
            <p className="px-4 py-6 text-sm opacity-70">
              No public pages created yet.
            </p>
          )}

          {pages.map((page) => (
            <div
              key={page.id}
              className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1.1fr] gap-3 px-4 py-4 text-sm"
            >
              <span className="font-medium">{page.title}</span>
              <span>{page.slug}</span>
              <span>{page.isPublished ? "Published" : "Draft"}</span>
              <form
                action={updatePublicPageSortOrderAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="pageId" value={page.id} />
                <input
                  className="w-20 rounded-lg border border-lightBorders-400 bg-white px-2 py-1 dark:border-darkBorders-500 dark:bg-jwdMarine-1000"
                  type="number"
                  name="sortOrder"
                  defaultValue={page.sortOrder}
                />
                <button className="btn btn-sm btn-outlined" type="submit">
                  Save
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="btn btn-sm btn-outlined"
                  href={`/admin/website/${page.id}`}
                >
                  Edit
                </Link>
                <form action={togglePublicPagePublishedAction}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input
                    type="hidden"
                    name="isPublished"
                    value={(!page.isPublished).toString()}
                  />
                  <button className="btn btn-sm btn-outlined" type="submit">
                    {page.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </form>
                <form action={deletePublicPageAction}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <button
                    className="btn btn-sm btn-contained bg-red-700 text-white hover:bg-red-800"
                    type="submit"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
