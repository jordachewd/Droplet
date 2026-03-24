import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAdminActionAccess,
  requireAdminPageAccess,
} from "@/lib/utils/admin-auth";
import { createTestUser, mockAuth } from "../test-support";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("admin-auth", () => {
  const redirectSentinel = new Error("redirected");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redirect).mockImplementation(() => {
      throw redirectSentinel;
    });
  });

  it("redirects unauthenticated page access to sign-in", async () => {
    mockAuth(vi.mocked(auth), {
      userId: null,
      isAuthenticated: false,
      sessionClaims: null,
    });

    await expect(requireAdminPageAccess()).rejects.toBe(redirectSentinel);
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects authenticated non-admin users to /403", async () => {
    const user = createTestUser();

    mockAuth(vi.mocked(auth), {
      userId: user.clerkId,
      isAuthenticated: true,
      sessionClaims: { metadata: { role: "client" } },
    });

    await expect(requireAdminPageAccess()).rejects.toBe(redirectSentinel);
    expect(redirect).toHaveBeenCalledWith("/403");
  });

  it("returns userId for admin page access", async () => {
    const admin = createTestUser({ role: "admin", clerkId: "admin_123" });

    mockAuth(vi.mocked(auth), {
      userId: admin.clerkId,
      isAuthenticated: true,
      sessionClaims: { metadata: { role: "admin" } },
    });

    await expect(requireAdminPageAccess()).resolves.toBe("admin_123");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("throws Unauthorized for unauthenticated action access", async () => {
    mockAuth(vi.mocked(auth), {
      userId: null,
      isAuthenticated: false,
      sessionClaims: null,
    });

    await expect(requireAdminActionAccess()).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden for non-admin action access", async () => {
    const user = createTestUser();

    mockAuth(vi.mocked(auth), {
      userId: user.clerkId,
      isAuthenticated: true,
      sessionClaims: { metadata: { role: "client" } },
    });

    await expect(requireAdminActionAccess()).rejects.toThrow("Forbidden");
  });

  it("returns userId for admin action access", async () => {
    const admin = createTestUser({ role: "admin", clerkId: "admin_456" });

    mockAuth(vi.mocked(auth), {
      userId: admin.clerkId,
      isAuthenticated: true,
      sessionClaims: { metadata: { role: "admin" } },
    });

    await expect(requireAdminActionAccess()).resolves.toBe("admin_456");
  });
});
