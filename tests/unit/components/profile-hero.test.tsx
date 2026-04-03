/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileHeroEditor from "@/components/sections/profile/profile-hero-editor";
import type { UserData } from "@/types/UserData.d";
import { useRouter } from "next/navigation";
import { updateUser } from "@/lib/actions/user.actions";

vi.mock("@/lib/actions/user.actions", () => ({
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const refreshMock = vi.hoisted(() => vi.fn());
const createObjectURLMock = vi.hoisted(() =>
  vi.fn(() => "blob:avatar-preview"),
);
const revokeObjectURLMock = vi.hoisted(() => vi.fn());

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: createObjectURLMock,
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: revokeObjectURLMock,
});

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
  },
  __v: 0,
};

describe("ProfileHeroEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      refresh: refreshMock,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(updateUser).mockResolvedValue({
      mongoResponse: {},
      message: "User updated successfully",
      status: 200,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates first name, last name, and email for the authenticated owner", async () => {
    render(<ProfileHeroEditor userData={baseUserData} />);

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Grace" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Hopper" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "grace@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(
        "clerk_user_1",
        expect.objectContaining({
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
          updatedAt: expect.any(Date),
        }),
      );
      expect(refreshMock).toHaveBeenCalledOnce();
    });
  });

  it("uploads avatar through /api/upload and saves the uploaded URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          fileUrl: "/api/download?key=clerk_user_1%2Fuploads%2Favatar.png",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileHeroEditor userData={baseUserData} />);

    const avatarInput = screen.getByLabelText("Avatar image");
    fireEvent.change(avatarInput, {
      target: {
        files: [new File(["avatar"], "avatar.png", { type: "image/png" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/upload", {
        method: "POST",
        body: expect.any(FormData),
      });
      expect(updateUser).toHaveBeenCalledWith(
        "clerk_user_1",
        expect.objectContaining({
          userimg: "/api/download?key=clerk_user_1%2Fuploads%2Favatar.png",
        }),
      );
    });
  });
});
