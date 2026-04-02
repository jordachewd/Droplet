import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getExpiresOn } from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { POST } from "@/app/api/webhooks/stripe/route";

const constructEventMock = vi.hoisted(() => vi.fn());
const stderrWriteMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("stripe", () => ({
  default: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}));

vi.mock("@/constants/plans", () => ({
  getExpiresOn: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

function buildRequest(body: string, signature?: string): NextRequest {
  const headers = new Headers();

  if (signature) {
    headers.set("stripe-signature", signature);
  }

  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(stderrWriteMock);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    vi.mocked(connectToDatabase).mockResolvedValue(
      {} as Awaited<ReturnType<typeof connectToDatabase>>,
    );
    vi.mocked(Transaction.findOne).mockResolvedValue(null);
    vi.mocked(Transaction.create).mockResolvedValue({
      _id: "txn_default",
    } as unknown as Awaited<ReturnType<typeof Transaction.create>>);
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_1",
    } as unknown as Awaited<ReturnType<typeof User.findOne>>);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      mongoResponse: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const response = await POST(buildRequest("{}"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("Webhook error");
    expect(payload.error).toBe("Webhook processing failed");
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Missing stripe-signature header.\n",
    );
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(buildRequest("{}", "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      message: "Webhook error",
      error: "Webhook processing failed",
    });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET.\n",
    );
  });

  it("returns 400 when webhook signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(buildRequest('{"hello":"world"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("Webhook error");
    expect(payload.error).toBe("Webhook processing failed");
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Invalid webhook signature: Invalid signature\n",
    );
  });

  it("returns 400 when checkout metadata is invalid", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "INVALID",
            billing: "Monthly",
          },
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      message: "Webhook error",
      error: "Webhook processing failed",
    });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Checkout session metadata is invalid.\n",
    );
  });

  it("tolerates extra metadata keys in checkout payload", async () => {
    const expiresOn = new Date("2026-04-05T10:00:00.000Z");
    vi.mocked(getExpiresOn).mockReturnValue(expiresOn);

    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123_extra_metadata",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
            name: "Buyer One",
            extraKey: "ignored-value",
          },
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeId: "cs_test_123_extra_metadata",
        userId: "mongo_user_1",
        clerkId: "clerk_user_1",
      }),
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("persists transaction and updates user plan on checkout completion", async () => {
    const expiresOn = new Date("2026-04-05T10:00:00.000Z");
    vi.mocked(getExpiresOn).mockReturnValue(expiresOn);

    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });

    vi.mocked(Transaction.create).mockResolvedValue({
      _id: "txn_1",
    } as unknown as Awaited<ReturnType<typeof Transaction.create>>);

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getExpiresOn).toHaveBeenCalledWith("Pro", "Monthly");
    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeId: "cs_test_123",
        userId: "mongo_user_1",
        clerkId: "clerk_user_1",
        amount: 19,
        plan: "Pro",
        billing: "Monthly",
      }),
    );
    expect(User.findOne).toHaveBeenCalledWith(
      {
        _id: "mongo_user_1",
        clerkId: "clerk_user_1",
      },
      "_id clerkId plan.stripeId",
      { lean: true },
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "mongo_user_1", clerkId: "clerk_user_1" },
      expect.objectContaining({
        plan: expect.objectContaining({
          name: "Pro",
          billing: "Monthly",
          amount: 19,
          stripeId: "cs_test_123",
          imageGenerations: 0,
          audioGenerations: 0,
          videoGenerations: 0,
          usagePeriodStart: expect.any(Date),
        }),
      }),
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
    expect(payload).toEqual({ message: "OK" });
  });

  it("returns 500 when transaction creation fails", async () => {
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-04-05T10:00:00.000Z"),
    );
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });
    vi.mocked(Transaction.create).mockRejectedValue(
      new Error("Transaction create failed"),
    );

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("Webhook error");
    expect(payload.error).toBe("Webhook processing failed");
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Failed to create transaction for session cs_test_123 and user mongo_user_1: Transaction create failed\n",
    );
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Transaction creation returned null for session cs_test_123 and user mongo_user_1.\n",
    );
  });

  it("returns 500 when user update fails after transaction creation", async () => {
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-04-05T10:00:00.000Z"),
    );
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(null);

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      message: "Webhook error",
      error: "Webhook processing failed",
    });
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Failed to update user plan for session cs_test_123 and user mongo_user_1.\n",
    );
  });

  it("returns 400 when checkout metadata cannot be matched to a user", async () => {
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-04-05T10:00:00.000Z"),
    );
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_404",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_404",
            clerkId: "clerk_user_404",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });
    vi.mocked(User.findOne).mockResolvedValue(null);

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("Webhook error");
    expect(payload.error).toBe("Webhook processing failed");
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Checkout session cs_test_404 could not be matched to user mongo_user_404.\n",
    );
  });

  it("returns a handled response for non-checkout webhook events", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toBe("Unhandled event");
    expect(payload.eventType).toBe("customer.created");
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Unhandled Stripe event type: customer.created\n",
    );
  });

  it("returns 200 without creating duplicate transaction for replayed webhook", async () => {
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-04-05T10:00:00.000Z"),
    );
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_duplicate",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_1",
            clerkId: "clerk_user_1",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });
    vi.mocked(Transaction.findOne).mockResolvedValue({
      stripeId: "cs_test_duplicate",
    });
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_1",
      plan: { stripeId: "cs_test_duplicate" },
    } as unknown as Awaited<ReturnType<typeof User.findOne>>);

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toBe("Already processed");
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("repairs user plan when replayed webhook has existing transaction but stale user plan", async () => {
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-04-05T10:00:00.000Z"),
    );
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_duplicate_short_circuit",
          amount_total: 1900,
          metadata: {
            userId: "mongo_user_deleted",
            clerkId: "clerk_user_deleted",
            planId: "1",
            plan: "Pro",
            billing: "Monthly",
          },
        },
      },
    });
    vi.mocked(Transaction.findOne).mockResolvedValue({
      stripeId: "cs_test_duplicate_short_circuit",
    });
    vi.mocked(User.findOne).mockResolvedValue({
      _id: "mongo_user_deleted",
      clerkId: "clerk_user_deleted",
    } as unknown as Awaited<ReturnType<typeof User.findOne>>);

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toBe("OK");
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "mongo_user_deleted", clerkId: "clerk_user_deleted" },
      expect.objectContaining({
        plan: expect.objectContaining({
          stripeId: "cs_test_duplicate_short_circuit",
          name: "Pro",
        }),
      }),
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
    expect(stderrWriteMock).toHaveBeenCalledWith(
      "[stripe-webhook] Repairing user plan state for replayed session cs_test_duplicate_short_circuit and user mongo_user_deleted.\n",
    );
  });
});
