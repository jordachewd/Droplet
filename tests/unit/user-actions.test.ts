import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { getUserById, updateUser } from "@/lib/actions/user.actions";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
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
