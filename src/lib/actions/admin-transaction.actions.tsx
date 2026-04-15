"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import { createAdminAuditLogEntry } from "@/lib/utils/admin-audit";
import { requireAdminActionAccess } from "@/lib/utils/admin-auth";
import type { AdminActionState } from "@/components/admin/admin-action-state";
import {
  bulkDeleteTransactionsActionSchema,
  type BulkDeleteTransactionsActionInput,
  errorState,
  logAdminActionError,
  pluralize,
  resolveActionFormData,
  successState,
  withSummaryDetails,
} from "@/lib/actions/admin-action-helpers";

export async function bulkDeleteTransactionsAction(
  previousStateOrFormData: AdminActionState | FormData,
  maybeFormData?: FormData,
): Promise<AdminActionState> {
  try {
    const formData = resolveActionFormData(
      previousStateOrFormData,
      maybeFormData,
    );
    const adminId = await requireAdminActionAccess();
    const parsedInput = bulkDeleteTransactionsActionSchema.safeParse({
      transactionIds: formData
        .getAll("transactionIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    });

    if (!parsedInput.success) {
      return errorState("Unable to remove selected transactions.");
    }

    const { transactionIds }: BulkDeleteTransactionsActionInput =
      parsedInput.data;

    await connectToDatabase();

    const result = await Transaction.deleteMany({
      _id: { $in: transactionIds },
    });
    const deletedCount = result.deletedCount ?? 0;
    const notFoundCount = Math.max(transactionIds.length - deletedCount, 0);
    const message = withSummaryDetails(
      `${deletedCount} transactions removed.`,
      [
        notFoundCount > 0
          ? `${notFoundCount} ${pluralize(notFoundCount, "transaction")} not found.`
          : "",
      ],
    );

    await createAdminAuditLogEntry({
      adminId,
      action: "transaction.bulk_delete",
      targetType: "Transaction",
      targetId: transactionIds.join(","),
      details: {
        selectedCount: transactionIds.length,
        deletedCount,
        notFoundCount,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");

    return successState(message, "warning");
  } catch (error) {
    logAdminActionError("bulkDeleteTransactionsAction", error);
    return errorState("Unable to remove selected transactions.");
  }
}
