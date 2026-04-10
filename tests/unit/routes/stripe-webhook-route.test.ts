import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getExpiresOn } from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { getEffectiveStripeBillingConfig } from "@/lib/utils/effective-stripe-billing-config";
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

vi.mock("@/lib/utils/effective-stripe-billing-config", () => ({
  getEffectiveStripeBillingConfig: vi.fn(),
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
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

function buildDefaultUser() {
  return {
    _id: "mongo_user_1",
    clerkId: "clerk_user_1",
    stripeCustomerId: "cus_test_1",
    stripeSubscriptionId: "sub_test_1",
    subscriptionStatus: "active",
    plan: {
      id: "1",
      name: "Pro",
      billing: "Monthly",
      amount: 19,
      startedOn: new Date("2026-03-01T00:00:00.000Z"),
      expiresOn: new Date("2026-04-01T00:00:00.000Z"),
      stripeId: "cs_previous",
      imageGenerations: 5,
      audioGenerations: 2,
      usagePeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      trialUsage: {
        trialImageGenerations: 0,
        trialAudioGenerations: 0,
        trialUsagePeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      },
    },
  };
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(stderrWriteMock);

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    vi.mocked(connectToDatabase).mockResolvedValue(
      {} as Awaited<ReturnType<typeof connectToDatabase>>,
    );
    vi.mocked(getExpiresOn).mockReturnValue(
      new Date("2026-05-01T00:00:00.000Z"),
    );
    vi.mocked(getEffectiveStripeBillingConfig).mockResolvedValue({
      stripePriceIds: {
        proMonthly: "price_pro_monthly",
        proYearly: "price_pro_yearly",
        premiumMonthly: "price_premium_monthly",
        premiumYearly: "price_premium_yearly",
      },
      yearlyDiscount: 30,
    });
    vi.mocked(Transaction.findOneAndUpdate).mockResolvedValue(null);
    vi.mocked(User.findOne).mockResolvedValue(
      buildDefaultUser() as unknown as Awaited<ReturnType<typeof User.findOne>>,
    );
    vi.mocked(User.findOneAndUpdate).mockResolvedValue({
      _id: "updated",
    } as unknown as Awaited<ReturnType<typeof User.findOneAndUpdate>>);
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
  });

  it("returns 400 when webhook signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(buildRequest('{"hello":"world"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(400);
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
          id: "cs_test_invalid",
          amount_total: 1900,
          subscription: "sub_test_1",
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
    expect(payload.error).toBe("Webhook processing failed");
  });

  it("processes checkout.session.completed and stores subscription metadata", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1900,
          subscription: "sub_test_123",
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

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(Transaction.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeId: "cs_test_123" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          stripeId: "cs_test_123",
          type: "subscription_initial",
          plan: "Pro",
          billing: "Monthly",
        }),
      }),
      expect.objectContaining({
        upsert: true,
        strict: true,
        returnDocument: "before",
      }),
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "mongo_user_1", clerkId: "clerk_user_1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          stripeSubscriptionId: "sub_test_123",
          subscriptionStatus: "active",
          plan: expect.objectContaining({
            stripeId: "cs_test_123",
            stripeSubscriptionId: "sub_test_123",
            subscriptionStatus: "active",
            imageGenerations: 0,
            audioGenerations: 0,
          }),
        }),
      }),
      expect.objectContaining({
        strict: true,
        upsert: false,
      }),
    );
  });

  it("returns Already processed for replayed checkout session", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_replay",
          amount_total: 1900,
          subscription: "sub_test_1",
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
    vi.mocked(Transaction.findOneAndUpdate).mockResolvedValue({
      _id: "txn_existing",
    } as Awaited<ReturnType<typeof Transaction.findOneAndUpdate>>);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof User.findOneAndUpdate>>,
    );

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "Already processed" });
  });

  it("processes invoice.paid renewal with idempotency on stripeInvoiceId", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_renewal_1",
          amount_paid: 1900,
          customer: "cus_test_1",
          subscription: "sub_test_1",
          lines: {
            data: [{ price: { id: "price_pro_monthly", unit_amount: 1900 } }],
          },
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(Transaction.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeInvoiceId: "in_test_renewal_1" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          stripeId: "in_test_renewal_1",
          stripeInvoiceId: "in_test_renewal_1",
          type: "subscription_renewal",
          plan: "Pro",
          billing: "Monthly",
        }),
      }),
      expect.objectContaining({
        upsert: true,
        strict: true,
      }),
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "mongo_user_1",
        clerkId: "clerk_user_1",
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          subscriptionStatus: "active",
          plan: expect.objectContaining({
            stripeId: "in_test_renewal_1",
            imageGenerations: 0,
            audioGenerations: 0,
          }),
        }),
      }),
      expect.objectContaining({
        strict: true,
      }),
    );
  });

  it("returns Already processed for replayed invoice.paid", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_replay",
          customer: "cus_test_1",
          subscription: "sub_test_1",
        },
      },
    });
    vi.mocked(Transaction.findOneAndUpdate).mockResolvedValue({
      _id: "txn_existing",
    } as Awaited<ReturnType<typeof Transaction.findOneAndUpdate>>);
    vi.mocked(User.findOneAndUpdate).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof User.findOneAndUpdate>>,
    );

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "Already processed" });
  });

  it("marks user past_due on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_failed_1",
          customer: "cus_test_1",
          subscription: "sub_test_1",
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "mongo_user_1",
        clerkId: "clerk_user_1",
        subscriptionStatus: { $ne: "past_due" },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          subscriptionStatus: "past_due",
        }),
      }),
      expect.objectContaining({
        strict: true,
      }),
    );
  });

  it("updates plan and status on customer.subscription.updated", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_1",
          customer: "cus_test_1",
          status: "active",
          current_period_end: 1_778_889_600,
          items: {
            data: [
              { price: { id: "price_premium_yearly", unit_amount: 32760 } },
            ],
          },
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "mongo_user_1",
        clerkId: "clerk_user_1",
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          stripeSubscriptionId: "sub_test_1",
          subscriptionStatus: "active",
          plan: expect.objectContaining({
            name: "Premium",
            billing: "Yearly",
            amount: 327.6,
          }),
        }),
      }),
      expect.objectContaining({
        strict: true,
      }),
    );
  });

  it("reverts user to Lite on customer.subscription.deleted", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_1",
          customer: "cus_test_1",
          status: "canceled",
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "mongo_user_1",
        clerkId: "clerk_user_1",
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          subscriptionStatus: "canceled",
          plan: expect.objectContaining({
            name: "Lite",
            billing: "Monthly",
            amount: 0,
          }),
        }),
        $unset: expect.objectContaining({
          stripeSubscriptionId: "",
        }),
      }),
      expect.objectContaining({
        strict: true,
      }),
    );
  });

  it("does not send overlapping plan paths in $set and $unset for customer.subscription.deleted", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_1",
          customer: "cus_test_1",
          status: "canceled",
        },
      },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(1);

    const updateDocument = vi.mocked(User.findOneAndUpdate).mock
      .calls[0]?.[1] as
      | {
          $set?: Record<string, unknown>;
          $unset?: Record<string, string>;
        }
      | undefined;
    const setPaths = Object.keys(updateDocument?.$set ?? {}).filter(
      (path) => path === "plan" || path.startsWith("plan."),
    );
    const unsetPaths = Object.keys(updateDocument?.$unset ?? {}).filter(
      (path) => path === "plan" || path.startsWith("plan."),
    );
    const hasOverlappingPlanPaths = setPaths.some((setPath) =>
      unsetPaths.some(
        (unsetPath) =>
          setPath === unsetPath ||
          setPath.startsWith(`${unsetPath}.`) ||
          unsetPath.startsWith(`${setPath}.`),
      ),
    );

    expect(hasOverlappingPlanPaths).toBe(false);
  });

  it("returns OK when invoice event cannot be matched to a user", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_unmatched_1",
          customer: "cus_missing",
          subscription: "sub_missing",
        },
      },
    });
    vi.mocked(User.findOne).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof User.findOne>>,
    );

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ message: "OK" });
    expect(Transaction.findOneAndUpdate).not.toHaveBeenCalled();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns a handled response for unknown webhook events", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });

    const response = await POST(buildRequest('{"valid":"payload"}', "sig_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      message: "Unhandled event",
      eventType: "customer.created",
    });
  });
});
