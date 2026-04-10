"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  bulkDeletePublicPagesAction,
  bulkPublishPublicPagesAction,
  bulkUnpublishPublicPagesAction,
  createPublicPageAction,
  deletePublicPageAction,
  togglePublicPagePublishedAction,
  updatePublicPageSortOrderAction,
} from "@/lib/actions/admin.actions";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";

interface AdminWebsitePageItem {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
  isPublished: boolean;
}

interface AdminWebsiteManagerProps {
  pages: AdminWebsitePageItem[];
}

export function AdminWebsiteManager({ pages }: AdminWebsiteManagerProps) {
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const selectedSet = useMemo(
    () => new Set(selectedPageIds),
    [selectedPageIds],
  );
  const allSelected =
    pages.length > 0 && selectedPageIds.length === pages.length;

  const handleTogglePage = (pageId: string) => {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((value) => value !== pageId)
        : [...current, pageId],
    );
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedPageIds([]);
      return;
    }

    setSelectedPageIds(pages.map((page) => page.id));
  };

  return (
    <div className="AdminWebsiteManager flex flex-col gap-6">
      <AdminManagedForm
        action={createPublicPageAction}
        className="admin-surface-subtle grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Title</span>
          <input
            className="form-text-input rounded-xl"
            type="text"
            name="title"
            placeholder="About Droplet"
            required
            aria-required="true"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Slug</span>
          <input
            className="form-text-input rounded-xl"
            type="text"
            name="slug"
            placeholder="about"
            required
            aria-required="true"
          />
        </label>
        <div className="flex items-end">
          <AdminFormSubmitButton
            label="Create Page"
            pendingLabel="Creating..."
          />
        </div>
      </AdminManagedForm>

      <div className="admin-table-shell">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
          <label className="inline-flex items-center gap-2 admin-label">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAll}
              aria-label="Select all pages"
            />
            Select All
          </label>

          {selectedPageIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-label">
                {selectedPageIds.length} selected
              </span>

              <AdminManagedForm
                action={bulkPublishPublicPagesAction}
                className="inline-flex"
                confirmMessage="Publish all selected pages?"
              >
                {selectedPageIds.map((pageId) => (
                  <input
                    key={`publish-${pageId}`}
                    type="hidden"
                    name="pageIds"
                    value={pageId}
                  />
                ))}
                <AdminFormSubmitButton
                  className="btn btn-sm btn-outlined"
                  label="Bulk Publish"
                  pendingLabel="Publishing..."
                />
              </AdminManagedForm>

              <AdminManagedForm
                action={bulkUnpublishPublicPagesAction}
                className="inline-flex"
                confirmMessage="Unpublish all selected pages?"
              >
                {selectedPageIds.map((pageId) => (
                  <input
                    key={`unpublish-${pageId}`}
                    type="hidden"
                    name="pageIds"
                    value={pageId}
                  />
                ))}
                <AdminFormSubmitButton
                  className="btn btn-sm btn-outlined"
                  label="Bulk Unpublish"
                  pendingLabel="Unpublishing..."
                />
              </AdminManagedForm>

              <AdminManagedForm
                action={bulkDeletePublicPagesAction}
                className="inline-flex"
                confirmMessage="Are you sure you want to delete all selected pages? This action cannot be undone."
              >
                {selectedPageIds.map((pageId) => (
                  <input
                    key={`delete-${pageId}`}
                    type="hidden"
                    name="pageIds"
                    value={pageId}
                  />
                ))}
                <AdminFormSubmitButton
                  className="btn btn-sm btn-contained bg-red-700 text-white hover:bg-red-800"
                  label="Bulk Delete"
                  pendingLabel="Deleting..."
                />
              </AdminManagedForm>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-[0.35fr_1.2fr_1fr_0.7fr_0.7fr_1.2fr] gap-3 border-b border-slate-300 px-4 py-3 admin-label dark:border-slate-500">
          <span></span>
          <span>Title</span>
          <span>Slug</span>
          <span>Status</span>
          <span>Sort</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-300 dark:divide-slate-500">
          {pages.length === 0 ? (
            <p className="px-4 py-6 text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
              No public pages created yet.
            </p>
          ) : null}

          {pages.map((page) => (
            <div
              key={page.id}
              className="grid grid-cols-[0.35fr_1.2fr_1fr_0.7fr_0.7fr_1.2fr] gap-3 px-4 py-4 text-sm"
            >
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSet.has(page.id)}
                  onChange={() => handleTogglePage(page.id)}
                  aria-label={`Select page ${page.title}`}
                />
              </label>

              <span className="font-medium">{page.title}</span>
              <span>{page.slug}</span>
              <span>{page.isPublished ? "Published" : "Draft"}</span>

              <AdminManagedForm
                action={updatePublicPageSortOrderAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="pageId" value={page.id} />
                <input
                  className="w-20 rounded-lg border border-slate-400 bg-lavenderHaze-100 px-2 py-1 dark:border-slate-500 dark:bg-nightIndigo-1000"
                  type="number"
                  name="sortOrder"
                  defaultValue={page.sortOrder}
                  aria-label={`Sort order for ${page.title}`}
                />
                <AdminFormSubmitButton
                  className="btn btn-sm btn-outlined"
                  label="Save"
                  pendingLabel="Saving..."
                />
              </AdminManagedForm>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="btn btn-sm btn-outlined"
                  href={`/admin/website/${page.id}`}
                >
                  Edit
                </Link>

                <AdminManagedForm
                  action={togglePublicPagePublishedAction}
                  className="inline-flex"
                >
                  <input type="hidden" name="pageId" value={page.id} />
                  <input
                    type="hidden"
                    name="isPublished"
                    value={(!page.isPublished).toString()}
                  />
                  <AdminFormSubmitButton
                    className="btn btn-sm btn-outlined"
                    label={page.isPublished ? "Unpublish" : "Publish"}
                    pendingLabel="Updating..."
                  />
                </AdminManagedForm>

                <AdminManagedForm
                  action={deletePublicPageAction}
                  className="inline-flex"
                  confirmMessage="Are you sure you want to delete this page? This action cannot be undone."
                >
                  <input type="hidden" name="pageId" value={page.id} />
                  <AdminFormSubmitButton
                    className="btn btn-sm btn-contained bg-red-700 text-white hover:bg-red-800"
                    label="Delete"
                    pendingLabel="Deleting..."
                  />
                </AdminManagedForm>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
