import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import UsageEvent from "@/lib/database/models/usage-event.model";
import RateLimitEntry from "@/lib/database/models/rate-limit-entry.model";
import Upload from "@/lib/database/models/upload.model";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";

vi.mock("@/lib/database/models/tasks.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/usage-event.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/rate-limit-entry.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/upload.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/utils/aws/delete-s3-prefix", () => ({
  default: vi.fn(),
}));

describe("deleteUserCascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Task.deleteMany).mockResolvedValue({
      acknowledged: true,
      deletedCount: 4,
    });
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      acknowledged: true,
      deletedCount: 3,
    });
    vi.mocked(UsageEvent.deleteMany).mockResolvedValue({
      acknowledged: true,
      deletedCount: 5,
    });
    vi.mocked(RateLimitEntry.deleteMany).mockResolvedValue({
      acknowledged: true,
      deletedCount: 2,
    });
    vi.mocked(Upload.deleteMany).mockResolvedValue({
      acknowledged: true,
      deletedCount: 9,
    });
    vi.mocked(deleteS3Prefix).mockResolvedValue(6);
  });

  it("deletes tasks, transactions, usage events, rate-limit entries, and S3 objects", async () => {
    const result = await deleteUserCascade("user_123");

    expect(Task.deleteMany).toHaveBeenCalledWith({ userId: "user_123" });
    expect(Transaction.deleteMany).toHaveBeenCalledWith({
      clerkId: "user_123",
    });
    expect(UsageEvent.deleteMany).toHaveBeenCalledWith({
      userId: "user_123",
    });
    expect(RateLimitEntry.deleteMany).toHaveBeenCalledWith({
      key: {
        $in: ["openai:user_123", "upload:user_123", "aws:user_123"],
      },
    });
    expect(Upload.deleteMany).toHaveBeenCalledWith({ userId: "user_123" });
    expect(deleteS3Prefix).toHaveBeenCalledWith("user_123/");
    expect(result).toEqual({
      deletedTasks: 4,
      deletedTransactions: 3,
      deletedUsageEvents: 5,
      deletedRateLimitEntries: 2,
      deletedUploads: 9,
      deletedObjectsCount: 6,
    });
  });

  it("continues cleanup when individual steps fail and reports failed steps", async () => {
    vi.mocked(Task.deleteMany).mockRejectedValueOnce(new Error("task failed"));
    vi.mocked(RateLimitEntry.deleteMany).mockRejectedValueOnce(
      new Error("rate-limit failed"),
    );
    vi.mocked(Upload.deleteMany).mockRejectedValueOnce(
      new Error("upload failed"),
    );
    const onStepError = vi.fn();

    const result = await deleteUserCascade("user_123", { onStepError });

    expect(onStepError).toHaveBeenCalledWith("task");
    expect(onStepError).toHaveBeenCalledWith("rate-limit");
    expect(onStepError).toHaveBeenCalledWith("upload");
    expect(Transaction.deleteMany).toHaveBeenCalledWith({
      clerkId: "user_123",
    });
    expect(UsageEvent.deleteMany).toHaveBeenCalledWith({
      userId: "user_123",
    });
    expect(deleteS3Prefix).toHaveBeenCalledWith("user_123/");
    expect(result).toEqual({
      deletedTasks: null,
      deletedTransactions: 3,
      deletedUsageEvents: 5,
      deletedRateLimitEntries: null,
      deletedUploads: null,
      deletedObjectsCount: 6,
    });
  });
});
