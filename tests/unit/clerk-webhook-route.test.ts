import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/clerk/route";
import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import Transaction from "@/lib/database/models/transaction.model";

const verifyMock = vi.hoisted(() => vi.fn());
const webhookCtorMock = vi.hoisted(() => vi.fn());

vi.mock("svix", () => ({
  Webhook: class MockWebhook {
    constructor(secret: string) {
      webhookCtorMock(secret);
    }

    verify = verifyMock;
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
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

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

function buildRequest(payload: unknown): Request {
  return new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function mockSvixHeaders({
  id = "msg_1",
  timestamp = "1730000000",
  signature = "v1,signature",
}: {
  id?: string | null;
  timestamp?: string | null;
  signature?: string | null;
}) {
  const mockedHeaders = new Headers();

  if (id) mockedHeaders.set("svix-id", id);
  if (timestamp) mockedHeaders.set("svix-timestamp", timestamp);
  if (signature) mockedHeaders.set("svix-signature", signature);

  vi.mocked(headers).mockResolvedValue(mockedHeaders as never);
}

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_clerk_test";
    mockSvixHeaders({});
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(User.create).mockResolvedValue({
      _id: "mongo_user_1",
      role: "client",
    } as never);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null as never);
    vi.mocked(User.findOne).mockResolvedValue(null as never);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue(null as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: vi.fn(),
      },
    } as never);
  });

  it("throws when CLERK_WEBHOOK_SECRET is missing", async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;

    await expect(POST(buildRequest({}))).rejects.toThrow(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  });

  it("returns 400 when svix headers are missing", async () => {
    mockSvixHeaders({ id: null, timestamp: null, signature: null });

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("no svix headers");
    expect(webhookCtorMock).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(buildRequest({ any: "payload" }));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Error occured");
    expect(User.create).not.toHaveBeenCalled();
  });

  it("creates a user and updates clerk metadata for user.created", async () => {
    const updateUserMetadataMock = vi.fn();
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: updateUserMetadataMock,
      },
    } as never);

    verifyMock.mockReturnValue({
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
    } as never);

    const response = await POST(buildRequest({ event: "user.created" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(webhookCtorMock).toHaveBeenCalledWith("whsec_clerk_test");
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "clerk_user_1",
        username: "adal",
        email: "clerk-user@example.com",
      }),
    );
    expect(updateUserMetadataMock).toHaveBeenCalledWith("clerk_user_1", {
      publicMetadata: {
        userId: "mongo_user_1",
        role: "client",
        userImg: "https://cdn.example.com/u1.png",
      },
    });
    expect(payload.message).toBe("OK");
    expect(payload.user._id).toBe("mongo_user_1");
  });

  it("updates an existing user for user.updated", async () => {
    verifyMock.mockReturnValue({
      type: "user.updated",
      data: {
        id: "clerk_user_1",
        updated_at: "2026-02-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Byron",
        image_url: "https://cdn.example.com/u2.png",
      },
    });
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      clerkId: "clerk_user_1",
    } as never);

    const response = await POST(buildRequest({ event: "user.updated" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { clerkId: "clerk_user_1" },
      expect.objectContaining({
        firstName: "Ada",
        lastName: "Byron",
        userimg: "https://cdn.example.com/u2.png",
      }),
      expect.objectContaining({
        new: true,
        strict: true,
        upsert: false,
      }),
    );
    expect(payload.message).toBe("OK");
  });

  it("returns 404 for user.updated when no matching user exists", async () => {
    verifyMock.mockReturnValue({
      type: "user.updated",
      data: {
        id: "missing_user",
        updated_at: "2026-02-01T00:00:00.000Z",
        first_name: "Ada",
        last_name: "Byron",
        image_url: "https://cdn.example.com/u2.png",
      },
    });
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null as never);

    const response = await POST(buildRequest({ event: "user.updated" }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe("Webhook error");
    expect(payload.error).toBe("User not found");
  });

  it("deletes user and linked transactions for user.deleted", async () => {
    verifyMock.mockReturnValue({
      type: "user.deleted",
      data: {
        id: "clerk_user_1",
      },
    });
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_1",
    } as never);
    vi.mocked(User.findByIdAndDelete).mockResolvedValue({
      acknowledged: true,
    } as never);
    vi.mocked(Transaction.deleteMany).mockResolvedValue({
      deletedCount: 3,
    } as never);

    const response = await POST(buildRequest({ event: "user.deleted" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(User.findOne).toHaveBeenCalledWith({ clerkId: "clerk_user_1" });
    expect(User.findByIdAndDelete).toHaveBeenCalledWith("mongo_user_1");
    expect(Transaction.deleteMany).toHaveBeenCalledWith({
      clerkId: "clerk_user_1",
    });
    expect(payload.message).toBe("OK");
    expect(payload.deletedTransactions.deletedCount).toBe(3);
  });

  it("returns 200 fallback response for unhandled event types", async () => {
    verifyMock.mockReturnValue({
      type: "session.created",
      data: {},
    });

    const response = await POST(buildRequest({ event: "session.created" }));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain(
      "Cellesseon | Clerk Webhook Response",
    );
  });
});
