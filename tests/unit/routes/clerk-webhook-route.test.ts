import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/clerk/route";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { deleteUserCascade } from "@/lib/utils/delete-user-cascade";

const verifyWebhookMock = vi.hoisted(() => vi.fn());
const stderrWriteMock = vi.hoisted(() => vi.fn(() => true));
const getUserMock = vi.hoisted(() => vi.fn());
const updateUserMetadataMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: verifyWebhookMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock("@/lib/utils/delete-user-cascade", () => ({
  deleteUserCascade: vi.fn(),
}));

function buildRequest(payload: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1730000000",
      "svix-signature": "v1,signature",
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyWebhookMock.mockReset();
    getUserMock.mockReset();
    updateUserMetadataMock.mockReset();
    vi.spyOn(process.stderr, "write").mockImplementation(stderrWriteMock);
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_clerk_signing_test";
    vi.mocked(connectToDatabase).mockResolvedValue(
      {} as Awaited<ReturnType<typeof connectToDatabase>>,
    );
    vi.mocked(User.create).mockResolvedValue({
      _id: "mongo_user_1",
      role: "client",
    } as unknown as Awaited<ReturnType<typeof User.create>>);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null);
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue(null);
    vi.mocked(deleteUserCascade).mockResolvedValue({
      deletedTasks: 0,
      deletedTransactions: 0,
      deletedUsageEvents: 0,
      deletedRateLimitEntries: 0,
      deletedUploads: 0,
      deletedObjectsCount: 0,
    });
    getUserMock.mockResolvedValue({
      emailAddresses: [],
      primaryEmailAddressId: null,
      username: null,
      firstName: null,
      lastName: null,
      imageUrl: "",
    });
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: getUserMock,
        updateUserMetadata: updateUserMetadataMock,
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the Clerk webhook signing secret is missing", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    await expect(POST(buildRequest({}))).rejects.toThrow(
      "Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local",
    );
  });

  it("returns 400 when signature verification fails", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("Invalid signature"));

    const response = await POST(buildRequest({ any: "payload" }));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Webhook verification failed");
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining("[clerk-webhook] Verification failed:"),
    );
    expect(User.create).not.toHaveBeenCalled();
  });

  it("creates a user and updates clerk metadata for user.created", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_user_1",
        email_addresses: [{ email_address: "clerk-user@example.com" }],
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Lovelace",
        username: "adal",
        image_url: "https://cdn.example.com/u1.png",
      },
    });
    vi.mocked(User.create).mockResolvedValue({
      _id: "mongo_user_1",
      role: "client",
    } as unknown as Awaited<ReturnType<typeof User.create>>);

    const response = await POST(buildRequest({ event: "user.created" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(verifyWebhookMock).toHaveBeenCalledWith(expect.any(Request), {
      signingSecret: "whsec_clerk_signing_test",
    });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "clerk_user_1",
        username: "adal",
        email: "clerk-user@example.com",
      }),
    );
    expect(getUserMock).not.toHaveBeenCalled();
    expect(updateUserMetadataMock).toHaveBeenCalledWith("clerk_user_1", {
      publicMetadata: {
        userId: "mongo_user_1",
        role: "client",
        userImg: "https://cdn.example.com/u1.png",
      },
    });
    expect(payload).toEqual({ message: "OK" });
  });

  it("treats replayed user.created events as idempotent", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_user_1",
        email_addresses: [{ email_address: "clerk-user@example.com" }],
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Lovelace",
        username: "adal",
        image_url: "https://cdn.example.com/u1.png",
      },
    });
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_existing",
      clerkId: "clerk_user_1",
      role: "client",
    });

    const response = await POST(buildRequest({ event: "user.created" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(User.create).not.toHaveBeenCalled();
    expect(updateUserMetadataMock).toHaveBeenCalledWith("clerk_user_1", {
      publicMetadata: {
        userId: "mongo_user_existing",
        role: "client",
        userImg: "https://cdn.example.com/u1.png",
      },
    });
    expect(payload).toEqual({ message: "OK" });
  });

  it("handles duplicate-key races for replayed user.created events", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_user_1",
        email_addresses: [{ email_address: "clerk-user@example.com" }],
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Lovelace",
        username: "adal",
        image_url: "https://cdn.example.com/u1.png",
      },
    });
    vi.mocked(User.findOne).mockResolvedValueOnce(null).mockResolvedValueOnce({
      _id: "mongo_user_existing",
      clerkId: "clerk_user_1",
      role: "client",
    });
    vi.mocked(User.create).mockRejectedValueOnce({
      code: 11000,
    });

    const response = await POST(buildRequest({ event: "user.created" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(User.create).toHaveBeenCalledTimes(1);
    expect(updateUserMetadataMock).toHaveBeenCalledWith("clerk_user_1", {
      publicMetadata: {
        userId: "mongo_user_existing",
        role: "client",
        userImg: "https://cdn.example.com/u1.png",
      },
    });
    expect(payload).toEqual({ message: "OK" });
  });

  it("resolves the primary email and generates a fallback username locally when Clerk omits username", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_abc12345",
        email_addresses: [
          {
            id: "email_secondary",
            email_address: "secondary@example.com",
          },
          {
            id: "email_primary",
            email_address: "primary@example.com",
          },
        ],
        primary_email_address_id: "email_primary",
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Lovelace",
        username: null,
        image_url: "https://cdn.example.com/u1.png",
      },
    });

    const response = await POST(buildRequest({ event: "user.created" }));

    expect(response.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_abc12345",
        email: "primary@example.com",
        username: "primary-abc12345",
      }),
    );
  });

  it("does not call Clerk getUser when webhook includes email but omits username", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_email_only_1",
        email_addresses: [{ email_address: "email-only@example.com" }],
        primary_email_address_id: null,
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "",
        last_name: "",
        username: "   ",
        image_url: "https://cdn.example.com/u1.png",
      },
    });

    const response = await POST(buildRequest({ event: "user.created" }));

    expect(response.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_email_only_1",
        email: "email-only@example.com",
        username: expect.stringMatching(/^email-only-/),
      }),
    );
  });

  it("falls back to Clerk backend user data when the webhook payload omits email addresses", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_backend_1",
        email_addresses: [],
        primary_email_address_id: null,
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: null,
        last_name: null,
        username: null,
        image_url: null,
      },
    });
    getUserMock.mockResolvedValue({
      emailAddresses: [
        {
          id: "backend_primary",
          emailAddress: "backend@example.com",
        },
      ],
      primaryEmailAddressId: "backend_primary",
      username: "backend-user",
      firstName: "Grace",
      lastName: "Hopper",
      imageUrl: "https://cdn.example.com/backend.png",
    });

    const response = await POST(buildRequest({ event: "user.created" }));

    expect(response.status).toBe(200);
    expect(getUserMock).toHaveBeenCalledWith("user_backend_1");
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_backend_1",
        email: "backend@example.com",
        username: "backend-user",
        firstName: "Grace",
        lastName: "Hopper",
        userimg: "https://cdn.example.com/backend.png",
      }),
    );
    expect(updateUserMetadataMock).toHaveBeenCalledWith("user_backend_1", {
      publicMetadata: {
        userId: "mongo_user_1",
        role: "client",
        userImg: "https://cdn.example.com/backend.png",
      },
    });
  });

  it("returns 500 with a generic error when user.created processing fails", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_user_1",
        email_addresses: [{ email_address: "clerk-user@example.com" }],
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Lovelace",
        username: "adal",
        image_url: "https://cdn.example.com/u1.png",
      },
    });
    vi.mocked(connectToDatabase).mockRejectedValueOnce(
      new Error("Atlas unavailable"),
    );

    const response = await POST(buildRequest({ event: "user.created" }));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      message: "Webhook error",
      error: "Failed to process Clerk webhook",
    });
    expect(User.create).not.toHaveBeenCalled();
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "[clerk-webhook] user.created processing failed:",
      ),
    );
  });

  it("updates an existing user for user.updated", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.updated",
      data: {
        id: "clerk_user_1",
        updated_at: "2026-02-01T00:00:00.000Z",
        email_addresses: [
          {
            id: "secondary_email",
            email_address: "ada.secondary@example.com",
          },
          {
            id: "primary_email",
            email_address: "ada.byron@example.com",
          },
        ],
        primary_email_address_id: "primary_email",
        first_name: "Ada",
        last_name: "Byron",
        username: "ada-byron",
        image_url: "https://cdn.example.com/u2.png",
      },
    });
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      clerkId: "clerk_user_1",
    });

    const response = await POST(buildRequest({ event: "user.updated" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { clerkId: "clerk_user_1" },
      expect.objectContaining({
        email: "ada.byron@example.com",
        firstName: "Ada",
        lastName: "Byron",
        username: "ada-byron",
        userimg: "https://cdn.example.com/u2.png",
      }),
      expect.objectContaining({
        returnDocument: "after",
        strict: true,
        upsert: false,
      }),
    );
    expect(payload).toEqual({ message: "OK" });
  });

  it("returns 200 for replayed user.updated when no matching user exists", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.updated",
      data: {
        id: "missing_user",
        updated_at: "2026-02-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Byron",
        image_url: "https://cdn.example.com/u2.png",
      },
    });
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null);

    const response = await POST(buildRequest({ event: "user.updated" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
  });

  it("deletes user and runs shared cascade cleanup for user.deleted", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_1",
    });
    vi.mocked(User.findByIdAndDelete).mockResolvedValue({
      acknowledged: true,
    });
    vi.mocked(deleteUserCascade).mockResolvedValue({
      deletedTasks: 8,
      deletedTransactions: 3,
      deletedUsageEvents: 11,
      deletedRateLimitEntries: 4,
      deletedUploads: 6,
      deletedObjectsCount: 5,
    });

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith(
      { clerkId: "clerk_user_1" },
      "_id",
      { lean: true },
    );
    expect(deleteUserCascade).toHaveBeenCalledWith(
      "clerk_user_1",
      expect.objectContaining({
        onStepError: expect.any(Function),
      }),
    );
    expect(User.findByIdAndDelete).toHaveBeenCalledWith("mongo_user_1");
    const cascadeCallOrder =
      vi.mocked(deleteUserCascade).mock.invocationCallOrder[0];
    const deleteUserCallOrder = vi.mocked(User.findByIdAndDelete).mock
      .invocationCallOrder[0];
    expect(cascadeCallOrder).toBeLessThan(deleteUserCallOrder);
    expect(payload).toEqual({ message: "OK" });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[clerk-webhook] user.deleted cleanup counts user=1 transactions=3 tasks=8 usageEvents=11 rateLimitEntries=4 uploads=6 s3Objects=5\n",
    );
  });

  it("returns 200 for replayed user.deleted when the user no longer exists", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(User.findOne).mockResolvedValue(null);

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    expect(deleteUserCascade).toHaveBeenCalledWith(
      "clerk_user_1",
      expect.objectContaining({
        onStepError: expect.any(Function),
      }),
    );
    expect(payload).toEqual({ message: "OK" });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[clerk-webhook] user.deleted cleanup counts user=0 transactions=0 tasks=0 usageEvents=0 rateLimitEntries=0 uploads=0 s3Objects=0\n",
    );
  });

  it("returns 200 and logs task cleanup failure when cascade reports it", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(deleteUserCascade).mockImplementationOnce(async (_, options) => {
      options?.onStepError?.("task", new Error("task cleanup failed"));
      return {
        deletedTasks: null,
        deletedTransactions: 0,
        deletedUsageEvents: 0,
        deletedRateLimitEntries: 0,
        deletedUploads: 0,
        deletedObjectsCount: 4,
      };
    });

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteUserCascade).toHaveBeenCalledWith(
      "clerk_user_1",
      expect.objectContaining({
        onStepError: expect.any(Function),
      }),
    );
    expect(payload).toEqual({ message: "OK" });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "[clerk-webhook] user.deleted task cleanup failed:",
      ),
    );
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[clerk-webhook] user.deleted cleanup counts user=0 transactions=0 tasks=unknown usageEvents=0 rateLimitEntries=0 uploads=0 s3Objects=4\n",
    );
  });

  it("returns 200 when usage-event cleanup fails and logs partial cleanup", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(deleteUserCascade).mockImplementationOnce(async (_, options) => {
      options?.onStepError?.(
        "usage-event",
        new Error("usage-event cleanup failed"),
      );
      return {
        deletedTasks: 2,
        deletedTransactions: 0,
        deletedUsageEvents: null,
        deletedRateLimitEntries: 0,
        deletedUploads: 0,
        deletedObjectsCount: 3,
      };
    });

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteUserCascade).toHaveBeenCalledWith(
      "clerk_user_1",
      expect.objectContaining({
        onStepError: expect.any(Function),
      }),
    );
    expect(payload).toEqual({ message: "OK" });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "[clerk-webhook] user.deleted usage-event cleanup failed:",
      ),
    );
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[clerk-webhook] user.deleted cleanup counts user=0 transactions=0 tasks=2 usageEvents=unknown rateLimitEntries=0 uploads=0 s3Objects=3\n",
    );
  });

  it("returns 200 when rate-limit cleanup fails and logs partial cleanup", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(deleteUserCascade).mockImplementationOnce(async (_, options) => {
      options?.onStepError?.(
        "rate-limit",
        new Error("rate-limit cleanup failed"),
      );
      return {
        deletedTasks: 2,
        deletedTransactions: 0,
        deletedUsageEvents: 0,
        deletedRateLimitEntries: null,
        deletedUploads: 0,
        deletedObjectsCount: 3,
      };
    });

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteUserCascade).toHaveBeenCalledWith(
      "clerk_user_1",
      expect.objectContaining({
        onStepError: expect.any(Function),
      }),
    );
    expect(payload).toEqual({ message: "OK" });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "[clerk-webhook] user.deleted rate-limit cleanup failed:",
      ),
    );
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[clerk-webhook] user.deleted cleanup counts user=0 transactions=0 tasks=2 usageEvents=0 rateLimitEntries=unknown uploads=0 s3Objects=3\n",
    );
  });

  it("returns 200 fallback response for unhandled event types", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "session.created",
      data: {},
    });

    const response = await POST(buildRequest({ event: "session.created" }));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain(
      "Droplet | Clerk Webhook Response",
    );
  });
});
