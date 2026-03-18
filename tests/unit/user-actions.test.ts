import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
import { revalidatePath } from "next/cache";
import {
  deleteUser,
  getUserById,
  updateUser,
} from "@/lib/actions/user.actions";

const { mockDeleteClerkUser } = vi.hoisted(() => ({
  mockDeleteClerkUser: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi
    .fn()
    .mockResolvedValue({ users: { deleteUser: mockDeleteClerkUser } }),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

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

vi.mock("@/lib/utils/aws/delete-s3-prefix", () => ({
  default: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("getUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("returns data when authenticated user reads their own profile", async () => {
    const leanMock = vi.fn().mockResolvedValue({
      clerkId: "clerk_user_1",
      username: "alice",
      email: "alice@example.com",
    });
    const selectMock = vi.fn().mockReturnValue({
      lean: leanMock,
    });

    vi.mocked(User.findOne).mockReturnValue({
      select: selectMock,
    } as never);

    const response = await getUserById("clerk_user_1");

    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith({ clerkId: "clerk_user_1" });
    expect(selectMock).toHaveBeenCalledWith(
      "clerkId username email role plan firstName lastName userimg registerAt updatedAt",
    );
    expect(leanMock).toHaveBeenCalledOnce();
    expect(response).toEqual(
      expect.objectContaining({
        clerkId: "clerk_user_1",
        username: "alice",
      }),
    );
  });

  it("throws forbidden when authenticated user requests another user's profile", async () => {
    await expect(getUserById("clerk_user_2")).rejects.toThrow(
      "Forbidden | getUserById",
    );

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("throws unauthorized when no authenticated user exists", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(getUserById("clerk_user_1")).rejects.toThrow(
      "Unauthorized | getUserById",
    );

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("updateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
  });

  it("throws handled errors with source metadata when update fails", async () => {
    vi.mocked(User.findOneAndUpdate).mockRejectedValue(new Error("db failed"));

    await expect(
      updateUser("clerk_user_1", {
        updatedAt: new Date("2026-03-13T00:00:00Z"),
      }),
    ).rejects.toThrow("db failed | updateUser");
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_user_1" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    mockDeleteClerkUser.mockResolvedValue({});
    vi.mocked(Task.deleteMany).mockResolvedValue({ deletedCount: 0 } as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
    vi.mocked(deleteS3Prefix).mockResolvedValue(0);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue({
      _id: "mongo_user_1",
    } as never);
  });

  it("deletes tasks, transactions, s3 assets, and user for the authenticated owner", async () => {
    const deleteUserLeanMock = vi.fn().mockResolvedValue({
      _id: "mongo_user_1",
    });
    const deleteUserSelectMock = vi.fn().mockReturnValue({
      lean: deleteUserLeanMock,
    });
    vi.mocked(User.findOne).mockReturnValue({
      select: deleteUserSelectMock,
    } as never);
    vi.mocked(Task.deleteMany).mockResolvedValue({ deletedCount: 4 } as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 2,
    } as never);
    vi.mocked(deleteS3Prefix).mockResolvedValue(7);

    const response = await deleteUser("clerk_user_1");

    expect(mockDeleteClerkUser).toHaveBeenCalledWith("clerk_user_1");
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith({ clerkId: "clerk_user_1" });
    expect(deleteUserSelectMock).toHaveBeenCalledWith("_id");
    expect(deleteUserLeanMock).toHaveBeenCalledOnce();
    expect(Task.deleteMany).toHaveBeenCalledWith({ userId: "clerk_user_1" });
    expect(Transaction.deleteMany).toHaveBeenCalledWith({
      clerkId: "clerk_user_1",
    });
    expect(deleteS3Prefix).toHaveBeenCalledWith("clerk_user_1/");
    expect(User.findByIdAndDelete).toHaveBeenCalledWith("mongo_user_1");
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        message: "User deleted successfully.",
        deletedTasks: 4,
        deletedTransactions: 2,
        deletedObjectsCount: 7,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/app");
    expect(revalidatePath).toHaveBeenCalledWith("/app/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/app/library");
  });

  it("throws forbidden when authenticated user tries to delete another profile", async () => {
    await expect(deleteUser("clerk_user_2")).rejects.toThrow(
      "Forbidden | deleteUser",
    );

    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expect(Task.deleteMany).not.toHaveBeenCalled();
    expect(Transaction.deleteMany).not.toHaveBeenCalled();
  });

  it("returns a 404 response when user does not exist", async () => {
    const deleteUserLeanMock = vi.fn().mockResolvedValue(null);
    const deleteUserSelectMock = vi.fn().mockReturnValue({
      lean: deleteUserLeanMock,
    });
    vi.mocked(User.findOne).mockReturnValue({
      select: deleteUserSelectMock,
    } as never);

    const response = await deleteUser("clerk_user_1");

    expect(mockDeleteClerkUser).toHaveBeenCalledWith("clerk_user_1");
    expect(response).toEqual(
      expect.objectContaining({
        status: 404,
        message: "User does not exist!",
      }),
    );
    expect(Task.deleteMany).not.toHaveBeenCalled();
    expect(Transaction.deleteMany).not.toHaveBeenCalled();
    expect(deleteS3Prefix).not.toHaveBeenCalled();
    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("returns error and skips MongoDB cleanup when Clerk deletion fails", async () => {
    mockDeleteClerkUser.mockRejectedValue(new Error("Clerk API error"));

    const response = await deleteUser("clerk_user_1");

    expect(response).toEqual(
      expect.objectContaining({
        status: 500,
        message: "Account deletion failed. Please try again.",
      }),
    );
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expect(Task.deleteMany).not.toHaveBeenCalled();
    expect(Transaction.deleteMany).not.toHaveBeenCalled();
    expect(deleteS3Prefix).not.toHaveBeenCalled();
    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
