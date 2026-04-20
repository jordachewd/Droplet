import { auth, clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  deleteUser,
  getUserById,
  updateUser,
} from "@/lib/actions/user.actions";
import { revalidatePath } from "next/cache";
import { createTestUser, mockAuth, mockMongooseModel } from "../test-support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindOneMock,
  userFindOneAndUpdateMock,
  userFindByIdAndDeleteMock,
  deleteUserCascadeMock,
  deleteClerkUserMock,
  updateClerkUserMock,
} = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  userFindOneAndUpdateMock: vi.fn(),
  userFindByIdAndDeleteMock: vi.fn(),
  deleteUserCascadeMock: vi.fn(),
  deleteClerkUserMock: vi.fn(),
  updateClerkUserMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(async () => ({
    users: {
      deleteUser: deleteClerkUserMock,
      updateUser: updateClerkUserMock,
    },
  })),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: userFindOneMock,
    findOneAndUpdate: userFindOneAndUpdateMock,
    findByIdAndDelete: userFindByIdAndDeleteMock,
  },
}));

vi.mock("@/lib/utils/delete-user-cascade", () => ({
  deleteUserCascade: deleteUserCascadeMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mongooseModuleMock = {} as typeof import("mongoose");

describe("user.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(vi.mocked(auth), {
      userId: "user_123",
      isAuthenticated: true,
    });
    vi.mocked(connectToDatabase).mockResolvedValue(mongooseModuleMock);
    deleteClerkUserMock.mockResolvedValue(undefined);
    updateClerkUserMock.mockResolvedValue(undefined);
    deleteUserCascadeMock.mockResolvedValue({
      deletedTasks: 4,
      deletedTransactions: 2,
      deletedUsageEvents: 7,
      deletedRateLimitEntries: 5,
      deletedUploads: 6,
      deletedObjectsCount: 3,
    });
    userFindByIdAndDeleteMock.mockResolvedValue({ _id: "mongo_user_1" });
  });

  describe("getUserById", () => {
    it("returns selected profile fields for the authenticated owner", async () => {
      const user = createTestUser({
        clerkId: "user_123",
        username: "alice",
        email: "alice@example.com",
      });
      const userQuery = mockMongooseModel(user);
      userFindOneMock.mockReturnValue(userQuery);

      const response = await getUserById("user_123");

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(userFindOneMock).toHaveBeenCalledWith({ clerkId: "user_123" });
      expect(userQuery.select).toHaveBeenCalledWith(
        "clerkId username email role suspended plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart",
      );
      expect(response).toMatchObject({
        clerkId: "user_123",
        username: "alice",
      });
    });

    it("rejects unauthenticated profile reads", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(getUserById("user_123")).rejects.toThrow("Unauthorized");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneMock).not.toHaveBeenCalled();
    });

    it("rejects cross-user profile reads", async () => {
      await expect(getUserById("other_user")).rejects.toThrow("Forbidden");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneMock).not.toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("updates owner profile with strict and non-upsert settings", async () => {
      userFindOneAndUpdateMock.mockResolvedValue(
        createTestUser({
          clerkId: "user_123",
          username: "updated-user",
        }),
      );

      const response = await updateUser("user_123", {
        username: "updated-user",
        updatedAt: new Date("2026-03-25T00:00:00.000Z"),
      });

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(userFindOneAndUpdateMock).toHaveBeenCalledWith(
        { clerkId: "user_123" },
        expect.objectContaining({
          username: "updated-user",
        }),
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "User updated successfully (user.actions.ts)",
        }),
      );
      expect(updateClerkUserMock).not.toHaveBeenCalled();
    });

    it("syncs avatar updates to Clerk when userimg is provided", async () => {
      userFindOneAndUpdateMock.mockResolvedValue(
        createTestUser({
          clerkId: "user_123",
          userimg: "https://cdn.example.com/avatar-updated.png",
        }),
      );

      const response = await updateUser("user_123", {
        userimg: "https://cdn.example.com/avatar-updated.png",
        updatedAt: new Date("2026-03-25T00:00:00.000Z"),
      });

      expect(vi.mocked(clerkClient)).toHaveBeenCalledOnce();
      expect(updateClerkUserMock).toHaveBeenCalledWith("user_123", {
        imageUrl: "https://cdn.example.com/avatar-updated.png",
      });
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "User updated successfully (user.actions.ts)",
        }),
      );
    });

    it("syncs firstName and lastName to Clerk in one batched update call", async () => {
      userFindOneAndUpdateMock.mockResolvedValue(
        createTestUser({
          clerkId: "user_123",
          firstName: "Updated",
          lastName: "Name",
        }),
      );

      const response = await updateUser("user_123", {
        firstName: "Updated",
        lastName: "Name",
        updatedAt: new Date("2026-03-25T00:00:00.000Z"),
      });

      expect(vi.mocked(clerkClient)).toHaveBeenCalledOnce();
      expect(updateClerkUserMock).toHaveBeenCalledTimes(1);
      expect(updateClerkUserMock).toHaveBeenCalledWith("user_123", {
        firstName: "Updated",
        lastName: "Name",
      });
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "User updated successfully (user.actions.ts)",
        }),
      );
    });

    it("does not fail profile updates when Clerk profile sync fails", async () => {
      userFindOneAndUpdateMock.mockResolvedValue(
        createTestUser({
          clerkId: "user_123",
          firstName: "Updated",
          lastName: "Name",
        }),
      );
      updateClerkUserMock.mockRejectedValueOnce(new Error("Clerk unavailable"));

      const response = await updateUser("user_123", {
        firstName: "Updated",
        lastName: "Name",
        updatedAt: new Date("2026-03-25T00:00:00.000Z"),
      });

      expect(vi.mocked(clerkClient)).toHaveBeenCalledOnce();
      expect(updateClerkUserMock).toHaveBeenCalledWith("user_123", {
        firstName: "Updated",
        lastName: "Name",
      });
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "User updated successfully (user.actions.ts)",
        }),
      );
    });

    it("returns 404 payload when user update target does not exist", async () => {
      userFindOneAndUpdateMock.mockResolvedValue(null);

      const response = await updateUser("user_123", {
        updatedAt: new Date("2026-03-25T00:00:00.000Z"),
      });

      expect(response).toEqual(
        expect.objectContaining({
          status: 404,
          message: "User update failed!",
          source: "updateUser",
        }),
      );
    });

    it("rejects unauthenticated updates", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(
        updateUser("user_123", {
          updatedAt: new Date("2026-03-25T00:00:00.000Z"),
        }),
      ).rejects.toThrow("Unauthorized");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects cross-user updates", async () => {
      await expect(
        updateUser("other_user", {
          updatedAt: new Date("2026-03-25T00:00:00.000Z"),
        }),
      ).rejects.toThrow("Forbidden");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects invalid update payloads", async () => {
      type InvalidUpdateUserInput = Parameters<typeof updateUser>[1] & {
        unsupportedField: string;
      };

      await expect(
        updateUser("user_123", {
          updatedAt: new Date("2026-03-25T00:00:00.000Z"),
          unsupportedField: "blocked",
        } as InvalidUpdateUserInput),
      ).rejects.toThrow("Invalid user payload.");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("deletes Clerk user, all owned data, and revalidates app routes", async () => {
      const existingUserQuery = mockMongooseModel({ _id: "mongo_user_1" });
      userFindOneMock.mockReturnValue(existingUserQuery);

      const response = await deleteUser("user_123");

      expect(vi.mocked(clerkClient)).toHaveBeenCalledOnce();
      expect(deleteClerkUserMock).toHaveBeenCalledWith("user_123");
      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(userFindOneMock).toHaveBeenCalledWith({ clerkId: "user_123" });
      expect(existingUserQuery.select).toHaveBeenCalledWith("_id role");
      expect(deleteUserCascadeMock).toHaveBeenCalledWith("user_123");
      expect(userFindByIdAndDeleteMock).toHaveBeenCalledWith("mongo_user_1");
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/app");
      expect(revalidatePath).toHaveBeenCalledWith("/app/profile");
      expect(revalidatePath).toHaveBeenCalledWith("/app/library");
      expect(response).toEqual(
        expect.objectContaining({
          status: 200,
          message: "User deleted successfully.",
          deletedTasks: 4,
          deletedTransactions: 2,
          deletedUsageEvents: 7,
          deletedRateLimitEntries: 5,
          deletedUploads: 6,
          deletedObjectsCount: 3,
        }),
      );
    });

    it("rejects unauthenticated deletion requests", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(deleteUser("user_123")).rejects.toThrow("Unauthorized");

      expect(vi.mocked(clerkClient)).not.toHaveBeenCalled();
      expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it("rejects cross-user deletion requests", async () => {
      await expect(deleteUser("other_user")).rejects.toThrow("Forbidden");

      expect(vi.mocked(clerkClient)).not.toHaveBeenCalled();
      expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it("returns 500 and skips Mongo cleanup when Clerk deletion fails", async () => {
      deleteClerkUserMock.mockRejectedValue(new Error("Clerk API unavailable"));

      const response = await deleteUser("user_123");

      expect(response).toEqual(
        expect.objectContaining({
          status: 500,
          message: "Account deletion failed. Please try again.",
          source: "deleteUser",
        }),
      );
      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(userFindOneMock).toHaveBeenCalledWith({ clerkId: "user_123" });
      expect(deleteUserCascadeMock).not.toHaveBeenCalled();
      expect(userFindByIdAndDeleteMock).not.toHaveBeenCalled();
    });

    it("returns 404 when Mongo user does not exist", async () => {
      userFindOneMock.mockReturnValue(mockMongooseModel(null));

      const response = await deleteUser("user_123");

      expect(response).toEqual(
        expect.objectContaining({
          status: 404,
          message: "User does not exist!",
          source: "deleteUser",
        }),
      );
      expect(deleteClerkUserMock).not.toHaveBeenCalled();
      expect(deleteUserCascadeMock).not.toHaveBeenCalled();
      expect(userFindByIdAndDeleteMock).not.toHaveBeenCalled();
    });

    it("refuses deletion when target account has admin role", async () => {
      userFindOneMock.mockReturnValue(
        mockMongooseModel({ _id: "mongo_user_1", role: "admin" }),
      );

      const response = await deleteUser("user_123");

      expect(response).toEqual(
        expect.objectContaining({
          status: 403,
          message: "Admin accounts cannot be deleted.",
          source: "deleteUser",
        }),
      );
      expect(deleteClerkUserMock).not.toHaveBeenCalled();
      expect(deleteUserCascadeMock).not.toHaveBeenCalled();
      expect(userFindByIdAndDeleteMock).not.toHaveBeenCalled();
    });

    it("returns 404 when final Mongo user delete does not delete a document", async () => {
      userFindOneMock.mockReturnValue(
        mockMongooseModel({ _id: "mongo_user_1" }),
      );
      userFindByIdAndDeleteMock.mockResolvedValue(null);

      const response = await deleteUser("user_123");

      expect(response).toEqual(
        expect.objectContaining({
          status: 404,
          message: "User deletion failed!",
          source: "deleteUser",
        }),
      );
    });
  });
});
