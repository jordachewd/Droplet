/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileDangerZone from "@/components/sections/profile/profile-danger-zone";
import type { UserData } from "@/types/UserData.d";
import { useClerk } from "@clerk/nextjs";
import { deleteUser } from "@/lib/actions/user.actions";

vi.mock("@/lib/actions/user.actions", () => ({
  deleteUser: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: vi.fn(),
}));

const signOutMock = vi.hoisted(() => vi.fn());

const baseUserData: UserData = {
  _id: "mongo_user_1",
  clerkId: "clerk_user_1",
  username: "ada",
  email: "ada@example.com",
  role: "client",
  registerAt: new Date("2026-01-01T00:00:00.000Z"),
  firstName: "Ada",
  lastName: "Lovelace",
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  userimg: "https://cdn.example.com/avatar.png",
  suspended: false,
  plan: {
    id: "0",
    name: "Lite",
    amount: 0,
    billing: "Monthly",
    startedOn: new Date("2026-01-01T00:00:00.000Z"),
    expiresOn: new Date("2027-01-01T00:00:00.000Z"),
    imageGenerations: 0,
    audioGenerations: 0,
    videoGenerations: 0,
  },
  __v: 0,
};

describe("ProfileDangerZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useClerk).mockReturnValue({
      signOut: signOutMock,
    } as never);
    vi.mocked(deleteUser).mockResolvedValue({ status: 200 } as never);
  });

  it("deletes account after confirmation and signs out", async () => {
    render(<ProfileDangerZone userData={baseUserData} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete My Account" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith("clerk_user_1");
      expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/" });
    });
  });

  it("shows an error when account deletion fails", async () => {
    vi.mocked(deleteUser).mockResolvedValue({ status: 500 } as never);
    render(<ProfileDangerZone userData={baseUserData} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete My Account" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to delete account. Please try again."),
      ).toBeTruthy();
    });
  });
});
