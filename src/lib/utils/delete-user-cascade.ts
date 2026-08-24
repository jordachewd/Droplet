import "server-only";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import RateLimitEntry from "@/lib/database/models/rate-limit-entry.model";
import Upload from "@/lib/database/models/upload.model";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";

export type DeleteUserCascadeStep =
  | "task"
  | "transaction"
  | "usage-event"
  | "rate-limit"
  | "upload"
  | "s3";

export interface DeleteUserCascadeResult {
  deletedTasks: number | null;
  deletedTransactions: number | null;
  deletedUsageEvents: number | null;
  deletedRateLimitEntries: number | null;
  deletedUploads: number | null;
  deletedObjectsCount: number | null;
}

function getRateLimitKeys(clerkId: string): string[] {
  return [
    `openai:${clerkId}`,
    `upload:${clerkId}`,
    `aws:${clerkId}`,
    `download:${clerkId}`,
  ];
}

function logDeleteUserCascadeFailure(
  step: DeleteUserCascadeStep,
  error: unknown,
): void {
  process.stderr.write(
    `[delete-user-cascade] ${step} cleanup failed: ${error instanceof Error ? error.message : "unknown"}\n`,
  );
}

export async function deleteUserCascade(
  clerkId: string,
  options?: {
    onStepError?: (step: DeleteUserCascadeStep, error: unknown) => void;
  },
): Promise<DeleteUserCascadeResult> {
  const normalizedClerkId = clerkId.trim();

  if (!normalizedClerkId) {
    throw new Error("Invalid user identifier.");
  }

  const onStepError = options?.onStepError ?? logDeleteUserCascadeFailure;
  const result: DeleteUserCascadeResult = {
    deletedTasks: null,
    deletedTransactions: null,
    deletedUsageEvents: null,
    deletedRateLimitEntries: null,
    deletedUploads: null,
    deletedObjectsCount: null,
  };

  try {
    const deletedTasks = await Task.deleteMany({ userId: normalizedClerkId });
    result.deletedTasks = deletedTasks.deletedCount ?? 0;
  } catch (error) {
    onStepError("task", error);
  }

  try {
    const deletedTransactions = await Transaction.deleteMany({
      clerkId: normalizedClerkId,
    });
    result.deletedTransactions = deletedTransactions.deletedCount ?? 0;
  } catch (error) {
    onStepError("transaction", error);
  }

  try {
    const deletedUsageEvents = await UsageEvent.deleteMany({
      userId: normalizedClerkId,
    });
    result.deletedUsageEvents = deletedUsageEvents.deletedCount ?? 0;
  } catch (error) {
    onStepError("usage-event", error);
  }

  try {
    const deletedRateLimitEntries = await RateLimitEntry.deleteMany({
      key: {
        $in: getRateLimitKeys(normalizedClerkId),
      },
    });
    result.deletedRateLimitEntries = deletedRateLimitEntries.deletedCount ?? 0;
  } catch (error) {
    onStepError("rate-limit", error);
  }

  try {
    const deletedUploads = await Upload.deleteMany({
      userId: normalizedClerkId,
    });
    result.deletedUploads = deletedUploads.deletedCount ?? 0;
  } catch (error) {
    onStepError("upload", error);
  }

  try {
    result.deletedObjectsCount = await deleteS3Prefix(`${normalizedClerkId}/`);
  } catch (error) {
    onStepError("s3", error);
  }

  return result;
}
