import "server-only";

import { z } from "zod";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import type { AdminActionState } from "@/components/admin/admin-action-state";

const numericFieldSchema = z.coerce.number().finite();
const booleanStringFieldSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const finiteNumericStringFieldSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value), {
    message: "Invalid numeric value.",
  });

export const supportEmailSchema = z.string().trim().email();
export const adminSettingCategorySchema = z.enum([
  "plans",
  "models",
  "theme",
  "limits",
  "trial",
  "features",
]);
export const currencySymbolSchema = z.enum(["$", "\u20AC"]);
export const PERSONA_ACCESS_KEYS = new Set([
  "persona_access_lite",
  "persona_access_pro",
  "persona_access_premium",
]);

export const removeUserByAdminActionSchema = z
  .object({
    userId: nonEmptyStringSchema,
  })
  .strict();
export const toggleUserSuspensionActionSchema = z
  .object({
    userId: nonEmptyStringSchema,
    suspended: booleanStringFieldSchema,
  })
  .strict();
export const bulkSuspendUsersActionSchema = z
  .object({
    userIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
export const bulkRemoveUsersActionSchema = z
  .object({
    userIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
export const createPublicPageActionSchema = z
  .object({
    title: nonEmptyStringSchema,
    slug: nonEmptyStringSchema,
  })
  .strict();
export const togglePublicPagePublishedActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    isPublished: booleanStringFieldSchema,
  })
  .strict();
export const deletePublicPageActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
  })
  .strict();
export const updatePublicPageSortOrderActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    sortOrder: finiteNumericStringFieldSchema,
  })
  .strict();
export const savePublicPageActionSchema = z
  .object({
    pageId: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    content: nonEmptyStringSchema,
  })
  .strict();
export const bulkDeletePublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
export const bulkPublishPublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
export const bulkUnpublishPublicPagesActionSchema = z
  .object({
    pageIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();
export const bulkDeleteTransactionsActionSchema = z
  .object({
    transactionIds: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();

export type RemoveUserByAdminActionInput = z.infer<
  typeof removeUserByAdminActionSchema
>;
export type ToggleUserSuspensionActionInput = z.infer<
  typeof toggleUserSuspensionActionSchema
>;
export type BulkSuspendUsersActionInput = z.infer<
  typeof bulkSuspendUsersActionSchema
>;
export type BulkRemoveUsersActionInput = z.infer<
  typeof bulkRemoveUsersActionSchema
>;
export type CreatePublicPageActionInput = z.infer<
  typeof createPublicPageActionSchema
>;
export type TogglePublicPagePublishedActionInput = z.infer<
  typeof togglePublicPagePublishedActionSchema
>;
export type DeletePublicPageActionInput = z.infer<
  typeof deletePublicPageActionSchema
>;
export type UpdatePublicPageSortOrderActionInput = z.infer<
  typeof updatePublicPageSortOrderActionSchema
>;
export type SavePublicPageActionInput = z.infer<
  typeof savePublicPageActionSchema
>;
export type BulkDeletePublicPagesActionInput = z.infer<
  typeof bulkDeletePublicPagesActionSchema
>;
export type BulkPublishPublicPagesActionInput = z.infer<
  typeof bulkPublishPublicPagesActionSchema
>;
export type BulkUnpublishPublicPagesActionInput = z.infer<
  typeof bulkUnpublishPublicPagesActionSchema
>;
export type BulkDeleteTransactionsActionInput = z.infer<
  typeof bulkDeleteTransactionsActionSchema
>;

export function getStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  const parsedValue = nonEmptyStringSchema.safeParse(value);

  if (!parsedValue.success) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return parsedValue.data;
}

export function getNumericField(formData: FormData, fieldName: string): number {
  const rawValue = getStringField(formData, fieldName);
  const parsedValue = numericFieldSchema.safeParse(rawValue);

  if (!parsedValue.success) {
    throw new Error(`Invalid numeric field: ${fieldName}`);
  }

  return parsedValue.data;
}

export function resolveActionFormData(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): FormData {
  if (previousStateOrFormData instanceof FormData) {
    return previousStateOrFormData;
  }

  if (maybeFormData instanceof FormData) {
    return maybeFormData;
  }

  throw new Error("Form data is required.");
}

export function successState(
  message: string,
  severity: AdminActionState["severity"] = "success",
): AdminActionState {
  return {
    status: "success",
    message,
    severity,
  };
}

export function errorState(message: string): AdminActionState {
  return {
    status: "error",
    message,
    severity: "error",
  };
}

export function logAdminActionError(context: string, error: unknown): void {
  process.stderr.write(
    `[admin.actions] ${context}: ${error instanceof Error ? error.message : "unknown"}\n`,
  );
}

export function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

export function withSummaryDetails(
  baseMessage: string,
  detailMessages: string[],
): string {
  const nonEmptyDetails = detailMessages.filter(
    (detail) => detail.trim().length > 0,
  );

  if (nonEmptyDetails.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} ${nonEmptyDetails.join(" ")}`;
}
