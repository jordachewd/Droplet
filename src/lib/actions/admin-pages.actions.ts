"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/database/mongoose";
import PublicPage from "@/lib/database/models/public-page.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import type { AdminActionState } from "@/components/admin/admin-action-state";
import {
  bulkDeletePublicPagesActionSchema,
  type BulkDeletePublicPagesActionInput,
  bulkPublishPublicPagesActionSchema,
  type BulkPublishPublicPagesActionInput,
  bulkUnpublishPublicPagesActionSchema,
  type BulkUnpublishPublicPagesActionInput,
  createPublicPageActionSchema,
  type CreatePublicPageActionInput,
  deletePublicPageActionSchema,
  type DeletePublicPageActionInput,
  errorState,
  logAdminActionError,
  pluralize,
  resolveActionFormData,
  savePublicPageActionSchema,
  type SavePublicPageActionInput,
  successState,
  togglePublicPagePublishedActionSchema,
  type TogglePublicPagePublishedActionInput,
  updatePublicPageSortOrderActionSchema,
  type UpdatePublicPageSortOrderActionInput,
  withSummaryDetails,
} from "@/lib/actions/admin-action-helpers";

export async function createPublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = createPublicPageActionSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
    });

    if (!parsedInput.success) {
      return errorState("Page title and slug are required.");
    }

    const { title, slug }: CreatePublicPageActionInput = parsedInput.data;

    await connectToDatabase();

    const existingPage = await PublicPage.findOne({ slug })
      .select("_id")
      .lean();

    if (existingPage) {
      return errorState("A page with this slug already exists.");
    }

    const latestPage = await PublicPage.findOne({})
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const page = await PublicPage.create({
      slug,
      title,
      content: "<p>Start writing...</p>",
      sortOrder: (latestPage?.sortOrder ?? -1) + 1,
      isPublished: false,
      updatedBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createAdminAuditLogEntry({
      adminId,
      action: "page.create",
      targetType: "PublicPage",
      targetId: String(page._id),
      details: {
        slug,
        title,
      },
    });

    revalidatePath("/admin/website");

    return successState("Public page created.");
  } catch (error) {
    logAdminActionError("createPublicPageAction", error);
    return errorState("Unable to create page.");
  }
}

export async function togglePublicPagePublishedAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = togglePublicPagePublishedActionSchema.safeParse({
      pageId: formData.get("pageId"),
      isPublished: formData.get("isPublished"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection and publish state are required.");
    }

    const { pageId, isPublished }: TogglePublicPagePublishedActionInput =
      parsedInput.data;

    await connectToDatabase();

    const page = await PublicPage.findByIdAndUpdate(
      pageId,
      {
        $set: {
          isPublished,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!page) {
      return errorState("Page not found.");
    }

    await createAdminAuditLogEntry({
      adminId,
      action: isPublished ? "page.publish" : "page.unpublish",
      targetType: "PublicPage",
      targetId: pageId,
      details: {
        slug: page.slug,
        isPublished,
      },
    });

    revalidatePath("/admin/website");
    revalidatePath(`/admin/website/${pageId}`);

    return successState(isPublished ? "Page published." : "Page unpublished.");
  } catch (error) {
    logAdminActionError("togglePublicPagePublishedAction", error);
    return errorState("Unable to change page publish state.");
  }
}

export async function deletePublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = deletePublicPageActionSchema.safeParse({
      pageId: formData.get("pageId"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection is required.");
    }

    const { pageId }: DeletePublicPageActionInput = parsedInput.data;

    await connectToDatabase();

    const deletedPage = await PublicPage.findByIdAndDelete(pageId);

    if (!deletedPage) {
      return errorState("Page not found.");
    }

    await createAdminAuditLogEntry({
      adminId,
      action: "page.delete",
      targetType: "PublicPage",
      targetId: pageId,
      details: {
        slug: deletedPage.slug,
        title: deletedPage.title,
      },
    });

    revalidatePath("/admin/website");

    return successState("Page deleted.", "warning");
  } catch (error) {
    logAdminActionError("deletePublicPageAction", error);
    return errorState("Unable to delete page.");
  }
}

export async function updatePublicPageSortOrderAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = updatePublicPageSortOrderActionSchema.safeParse({
      pageId: formData.get("pageId"),
      sortOrder: formData.get("sortOrder"),
    });

    if (!parsedInput.success) {
      return errorState("Page selection and sort order are required.");
    }

    const { pageId, sortOrder }: UpdatePublicPageSortOrderActionInput =
      parsedInput.data;

    await connectToDatabase();

    const page = await PublicPage.findByIdAndUpdate(
      pageId,
      {
        $set: {
          sortOrder,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!page) {
      return errorState("Page not found.");
    }

    await createAdminAuditLogEntry({
      adminId,
      action: "page.sort",
      targetType: "PublicPage",
      targetId: pageId,
      details: {
        slug: page.slug,
        sortOrder,
      },
    });

    revalidatePath("/admin/website");
    revalidatePath(`/admin/website/${pageId}`);

    return successState("Sort order updated.");
  } catch (error) {
    logAdminActionError("updatePublicPageSortOrderAction", error);
    return errorState("Unable to update sort order.");
  }
}

export async function savePublicPageAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = savePublicPageActionSchema.safeParse({
      pageId: formData.get("pageId"),
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsedInput.success) {
      return errorState("Page ID, title, and content are required.");
    }

    const { pageId, title, content }: SavePublicPageActionInput =
      parsedInput.data;

    await connectToDatabase();

    const page = await PublicPage.findByIdAndUpdate(
      pageId,
      {
        $set: {
          title,
          content,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!page) {
      return errorState("Page not found.");
    }

    await createAdminAuditLogEntry({
      adminId,
      action: "page.save",
      targetType: "PublicPage",
      targetId: pageId,
      details: {
        slug: page.slug,
        title,
      },
    });

    revalidatePath("/admin/website");
    revalidatePath(`/admin/website/${pageId}`);

    return successState("Page content saved.");
  } catch (error) {
    logAdminActionError("savePublicPageAction", error);
    return errorState("Unable to save page content.");
  }
}

export async function bulkDeletePublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkDeletePublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to delete selected pages.");
    }

    const { pageIds }: BulkDeletePublicPagesActionInput = parsedInput.data;

    await connectToDatabase();

    const result = await PublicPage.deleteMany({ _id: { $in: pageIds } });
    const deletedCount = result.deletedCount ?? 0;
    const notFoundCount = Math.max(pageIds.length - deletedCount, 0);
    const message = withSummaryDetails(`${deletedCount} pages deleted.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_delete",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        deletedCount,
        notFoundCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message, "warning");
  } catch (error) {
    logAdminActionError("bulkDeletePublicPagesAction", error);
    return errorState("Unable to delete selected pages.");
  }
}

export async function bulkPublishPublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkPublishPublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to publish selected pages.");
    }

    const { pageIds }: BulkPublishPublicPagesActionInput = parsedInput.data;

    await connectToDatabase();

    const result = await PublicPage.updateMany(
      { _id: { $in: pageIds } },
      {
        $set: {
          isPublished: true,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );
    const modifiedCount = result.modifiedCount ?? 0;
    const matchedCount = result.matchedCount ?? modifiedCount;
    const notFoundCount = Math.max(pageIds.length - matchedCount, 0);
    const alreadyPublishedCount = Math.max(matchedCount - modifiedCount, 0);
    const message = withSummaryDetails(`${modifiedCount} pages published.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
      alreadyPublishedCount > 0
        ? `${alreadyPublishedCount} ${pluralize(alreadyPublishedCount, "page")} already published.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_publish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount,
        matchedCount,
        notFoundCount,
        alreadyPublishedCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message);
  } catch (error) {
    logAdminActionError("bulkPublishPublicPagesAction", error);
    return errorState("Unable to publish selected pages.");
  }
}

export async function bulkUnpublishPublicPagesAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkUnpublishPublicPagesActionSchema.safeParse({
      pageIds: formData
        .getAll("pageIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to unpublish selected pages.");
    }

    const { pageIds }: BulkUnpublishPublicPagesActionInput = parsedInput.data;

    await connectToDatabase();

    const result = await PublicPage.updateMany(
      { _id: { $in: pageIds } },
      {
        $set: {
          isPublished: false,
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      {
        strict: true,
        upsert: false,
      },
    );
    const modifiedCount = result.modifiedCount ?? 0;
    const matchedCount = result.matchedCount ?? modifiedCount;
    const notFoundCount = Math.max(pageIds.length - matchedCount, 0);
    const alreadyUnpublishedCount = Math.max(matchedCount - modifiedCount, 0);
    const message = withSummaryDetails(`${modifiedCount} pages unpublished.`, [
      notFoundCount > 0
        ? `${notFoundCount} ${pluralize(notFoundCount, "page")} not found.`
        : "",
      alreadyUnpublishedCount > 0
        ? `${alreadyUnpublishedCount} ${pluralize(alreadyUnpublishedCount, "page")} already unpublished.`
        : "",
    ]);

    await createAdminAuditLogEntry({
      adminId,
      action: "page.bulk_unpublish",
      targetType: "PublicPage",
      targetId: pageIds.join(","),
      details: {
        selectedCount: pageIds.length,
        modifiedCount,
        matchedCount,
        notFoundCount,
        alreadyUnpublishedCount,
      },
    });

    revalidatePath("/admin/website");

    return successState(message);
  } catch (error) {
    logAdminActionError("bulkUnpublishPublicPagesAction", error);
    return errorState("Unable to unpublish selected pages.");
  }
}
