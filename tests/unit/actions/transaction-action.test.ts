import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  cancelSubscriptionAction,
  checkoutPlan,
  getAllTransactions,
  reactivateSubscriptionAction,
} from "@/lib/actions/transaction.action";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import { getEffectiveStripeBillingConfig } from "@/lib/utils/effective-stripe-billing-config";
import {
  createTestTransaction,
  createTestUser,
  mockAuth,
} from "../test-support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  stripeCreateSessionMock,
  stripeCreateCustomerMock,
  stripeRetrieveCustomerMock,
  stripeUpdateSubscriptionMock,
  userFindOneMock,
  userFindOneAndUpdateMock,
  transactionFindMock,
} = vi.hoisted(() => ({
  stripeCreateSessionMock: vi.fn(),
  stripeCreateCustomerMock: vi.fn(),
  stripeRetrieveCustomerMock: vi.fn(),
  stripeUpdateSubscriptionMock: vi.fn(),
  userFindOneMock: vi.fn(),
  userFindOneAndUpdateMock: vi.fn(),
  transactionFindMock: vi.fn(),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn(function StripeMock() {
    return {
      checkout: {
        sessions: {
          create: stripeCreateSessionMock,
        },
      },
      customers: {
        create: stripeCreateCustomerMock,
        retrieve: stripeRetrieveCustomerMock,
      },
      subscriptions: {
        update: stripeUpdateSubscriptionMock,
      },
    };
  });

  return {
    default: StripeMock,
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: userFindOneMock,
    findOneAndUpdate: userFindOneAndUpdateMock,
  },
}));

vi.mock("@/lib/database/models/transaction.model", () => ({
  default: {
    find: transactionFindMock,
  },
}));

vi.mock("@/lib/utils/effective-plan-config", () => ({
  getEffectivePlanConfig: vi.fn(),
}));

vi.mock("@/lib/utils/effective-stripe-billing-config", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/utils/effective-stripe-billing-config")
  >("@/lib/utils/effective-stripe-billing-config");

  return {
    ...actual,
    getEffectiveStripeBillingConfig: vi.fn(),
  };
});

const mongooseModuleMock = {} as typeof import("mongoose");

describe("transaction.action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });

    mockAuth(vi.mocked(auth), {
      userId: "user_123",
      isAuthenticated: true,
    });
    vi.mocked(connectToDatabase).mockResolvedValue(mongooseModuleMock);

    const user = createTestUser({
      _id: "507f1f77bcf86cd799439011",
      clerkId: "user_123",
      email: "buyer@example.com",
      username: "buyer",
      firstName: "Buyer",
      lastName: "One",
    });

    userFindOneMock.mockResolvedValue({
      _id: {
        toString: () => user._id,
      },
      clerkId: user.clerkId,
      role: "client",
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      stripeCustomerId: undefined,
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
      plan: {
        name: "Pro",
        expiresOn: new Date("2026-04-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
      },
    });
    userFindOneAndUpdateMock.mockResolvedValue({
      _id: user._id,
      clerkId: user.clerkId,
      stripeCustomerId: "cus_123",
    });

    vi.mocked(getEffectivePlanConfig).mockResolvedValue({
      pricing: {
        Lite: 0,
        Pro: 19,
        Premium: 39,
        currencySymbol: "$",
      },
      limits: {
        Lite: {
          conversationsPerDay: 5,
          promptsPerConversation: 10,
          images: 3,
          audio: 3,
        },
        Pro: {
          conversationsPerDay: 50,
          promptsPerConversation: 100,
          images: 50,
          audio: 50,
        },
        Premium: {
          conversationsPerDay: -1,
          promptsPerConversation: -1,
          images: -1,
          audio: -1,
        },
      },
      trialLimits: {
        promptsPerConversation: 5,
        images: 3,
        audio: 2,
      },
    });
    vi.mocked(getEffectiveStripeBillingConfig).mockResolvedValue({
      stripePriceIds: {
        proMonthly: "price_pro_monthly",
        proYearly: "price_pro_yearly",
        premiumMonthly: "price_premium_monthly",
        premiumYearly: "price_premium_yearly",
      },
      yearlyDiscount: 30,
    });

    stripeCreateSessionMock.mockResolvedValue({
      url: "http://stripe.test/session",
    });
    stripeCreateCustomerMock.mockResolvedValue({
      id: "cus_123",
    });
    stripeUpdateSubscriptionMock.mockResolvedValue({
      id: "sub_123",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: 1_775_372_800,
    });
  });

  describe("checkoutPlan", () => {
    it("creates checkout session and propagates redirect outside catch handling", async () => {
      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 19,
          },
        }),
      ).rejects.toThrow("NEXT_REDIRECT:http://stripe.test/session");

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(userFindOneMock).toHaveBeenCalledWith(
        { clerkId: "user_123" },
        "_id clerkId firstName lastName username email stripeCustomerId",
        { lean: true },
      );
      expect(vi.mocked(getEffectivePlanConfig)).toHaveBeenCalledOnce();
      expect(vi.mocked(getEffectiveStripeBillingConfig)).toHaveBeenCalledOnce();
      expect(stripeCreateCustomerMock).toHaveBeenCalledWith({
        email: "buyer@example.com",
        name: "Buyer One",
        metadata: {
          userId: "507f1f77bcf86cd799439011",
          clerkId: "user_123",
        },
      });
      expect(userFindOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: "507f1f77bcf86cd799439011", clerkId: "user_123" },
        {
          $set: {
            stripeCustomerId: "cus_123",
            updatedAt: expect.any(Date),
          },
        },
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
      expect(stripeCreateSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer: "cus_123",
          line_items: [{ price: "price_pro_monthly", quantity: 1 }],
          success_url:
            "http://localhost:3000/checkout-success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "http://localhost:3000/app/plans",
          metadata: expect.objectContaining({
            userId: "507f1f77bcf86cd799439011",
            clerkId: "user_123",
            plan: "Pro",
            billing: "Monthly",
            planId: "2",
          }),
          subscription_data: {
            metadata: {
              userId: "507f1f77bcf86cd799439011",
              clerkId: "user_123",
              plan: "Pro",
              billing: "Monthly",
            },
          },
        }),
      );
      expect(redirect).toHaveBeenCalledWith("http://stripe.test/session");
    });

    it("reuses existing Stripe customer when user already has stripeCustomerId", async () => {
      userFindOneMock.mockResolvedValue({
        _id: {
          toString: () => "507f1f77bcf86cd799439011",
        },
        clerkId: "user_123",
        firstName: "Buyer",
        lastName: "One",
        username: "buyer",
        email: "buyer@example.com",
        stripeCustomerId: "cus_existing_123",
      });
      stripeRetrieveCustomerMock.mockResolvedValue({
        id: "cus_existing_123",
      });

      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 19,
          },
        }),
      ).rejects.toThrow("NEXT_REDIRECT:http://stripe.test/session");

      expect(stripeRetrieveCustomerMock).toHaveBeenCalledWith(
        "cus_existing_123",
      );
      expect(stripeCreateCustomerMock).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
      expect(stripeCreateSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing_123",
        }),
      );
    });

    it("routes yearly checkout to yearly Stripe price id", async () => {
      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Yearly",
            name: "Pro",
            price: 159.6,
          },
        }),
      ).rejects.toThrow("NEXT_REDIRECT:http://stripe.test/session");

      expect(stripeCreateSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: "price_pro_yearly", quantity: 1 }],
          metadata: expect.objectContaining({
            billing: "Yearly",
          }),
          subscription_data: {
            metadata: expect.objectContaining({
              billing: "Yearly",
            }),
          },
        }),
      );
    });

    it("rejects invalid payload", async () => {
      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: -1,
          },
        }),
      ).rejects.toThrow("Invalid checkout payload.");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneMock).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated checkout", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 19,
          },
        }),
      ).rejects.toThrow("Unauthorized");

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(userFindOneMock).not.toHaveBeenCalled();
    });

    it("rejects checkout when user does not exist", async () => {
      userFindOneMock.mockResolvedValue(null);

      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 19,
          },
        }),
      ).rejects.toThrow("User not found");

      expect(stripeCreateSessionMock).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("rejects client-submitted price mismatches", async () => {
      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 999,
          },
        }),
      ).rejects.toThrow("Unable to start checkout.");

      expect(stripeCreateSessionMock).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("rejects checkout when Stripe price id is missing for plan and billing", async () => {
      vi.mocked(getEffectiveStripeBillingConfig).mockResolvedValue({
        stripePriceIds: {
          proMonthly: "",
          proYearly: "price_pro_yearly",
          premiumMonthly: "price_premium_monthly",
          premiumYearly: "price_premium_yearly",
        },
        yearlyDiscount: 30,
      });

      await expect(
        checkoutPlan({
          plan: {
            id: 2,
            billing: "Monthly",
            name: "Pro",
            price: 19,
          },
        }),
      ).rejects.toThrow("Unable to start checkout.");

      expect(stripeCreateSessionMock).not.toHaveBeenCalled();
      expect(stripeCreateCustomerMock).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("subscription cancellation actions", () => {
    it("schedules cancellation at period end and updates user subscription state", async () => {
      const response = await cancelSubscriptionAction();

      expect(response).toMatchObject({
        status: 200,
        severity: "success",
        subscriptionStatus: "active",
        cancelAtPeriodEnd: true,
      });
      expect(stripeUpdateSubscriptionMock).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: true,
      });
      expect(userFindOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: "507f1f77bcf86cd799439011", clerkId: "user_123" },
        {
          $set: expect.objectContaining({
            stripeSubscriptionId: "sub_123",
            subscriptionStatus: "active",
            "plan.cancelAtPeriodEnd": true,
            updatedAt: expect.any(Date),
          }),
        },
        {
          returnDocument: "after",
          strict: true,
          upsert: false,
        },
      );
      expect(revalidatePathMock).toHaveBeenCalledWith("/app/profile");
      expect(revalidatePathMock).toHaveBeenCalledWith("/app/plans");
    });

    it("returns warning when cancellation is already scheduled", async () => {
      userFindOneMock.mockResolvedValue({
        _id: {
          toString: () => "507f1f77bcf86cd799439011",
        },
        clerkId: "user_123",
        role: "client",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
        plan: {
          name: "Pro",
          cancelAtPeriodEnd: true,
          expiresOn: new Date("2026-04-01T00:00:00.000Z"),
        },
      });

      const response = await cancelSubscriptionAction();

      expect(response).toMatchObject({
        status: 200,
        severity: "warning",
        cancelAtPeriodEnd: true,
      });
      expect(stripeUpdateSubscriptionMock).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("returns warning when user has no paid subscription id", async () => {
      userFindOneMock.mockResolvedValue({
        _id: {
          toString: () => "507f1f77bcf86cd799439011",
        },
        clerkId: "user_123",
        role: "client",
        stripeSubscriptionId: null,
        subscriptionStatus: "active",
        plan: {
          name: "Pro",
          cancelAtPeriodEnd: false,
          expiresOn: new Date("2026-04-01T00:00:00.000Z"),
        },
      });

      const response = await cancelSubscriptionAction();

      expect(response).toMatchObject({
        status: 404,
        severity: "warning",
      });
      expect(stripeUpdateSubscriptionMock).not.toHaveBeenCalled();
    });

    it("returns provider-not-found error when Stripe subscription is missing", async () => {
      stripeUpdateSubscriptionMock.mockRejectedValue({
        code: "resource_missing",
      });

      const response = await cancelSubscriptionAction();

      expect(response).toMatchObject({
        status: 404,
        severity: "error",
      });
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("reactivates a pending cancellation", async () => {
      userFindOneMock.mockResolvedValue({
        _id: {
          toString: () => "507f1f77bcf86cd799439011",
        },
        clerkId: "user_123",
        role: "client",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
        plan: {
          name: "Pro",
          cancelAtPeriodEnd: true,
          expiresOn: new Date("2026-04-01T00:00:00.000Z"),
        },
      });
      stripeUpdateSubscriptionMock.mockResolvedValue({
        id: "sub_123",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1_775_372_800,
      });

      const response = await reactivateSubscriptionAction();

      expect(response).toMatchObject({
        status: 200,
        severity: "success",
        cancelAtPeriodEnd: false,
      });
      expect(stripeUpdateSubscriptionMock).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: false,
      });
      expect(userFindOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: "507f1f77bcf86cd799439011", clerkId: "user_123" },
        {
          $set: expect.objectContaining({
            "plan.cancelAtPeriodEnd": false,
          }),
        },
        expect.any(Object),
      );
    });

    it("returns warning when reactivation is not needed", async () => {
      userFindOneMock.mockResolvedValue({
        _id: {
          toString: () => "507f1f77bcf86cd799439011",
        },
        clerkId: "user_123",
        role: "client",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
        plan: {
          name: "Pro",
          cancelAtPeriodEnd: false,
          expiresOn: new Date("2026-04-01T00:00:00.000Z"),
        },
      });

      const response = await reactivateSubscriptionAction();

      expect(response).toMatchObject({
        status: 200,
        severity: "warning",
        cancelAtPeriodEnd: false,
      });
      expect(stripeUpdateSubscriptionMock).not.toHaveBeenCalled();
      expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("getAllTransactions", () => {
    it("returns owner transactions with projection, order, and hard limit", async () => {
      const transactionQuery = {
        select: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn(),
        exec: vi.fn(),
      };
      const transactionRows = [
        createTestTransaction({
          _id: "txn_1",
          clerkId: "user_123",
          plan: "Pro",
          amount: 19,
        }),
      ];

      transactionQuery.select.mockReturnValue(transactionQuery);
      transactionQuery.limit.mockReturnValue(transactionQuery);
      transactionQuery.lean.mockReturnValue(transactionQuery);
      transactionQuery.exec.mockResolvedValue(transactionRows);

      transactionFindMock.mockReturnValue(transactionQuery);

      const response = await getAllTransactions("user_123");

      expect(connectToDatabase).toHaveBeenCalledOnce();
      expect(transactionFindMock).toHaveBeenCalledWith(
        { clerkId: "user_123" },
        null,
        {
          sort: {
            createdAt: -1,
          },
        },
      );
      expect(transactionQuery.select).toHaveBeenCalledWith(
        "plan amount billing createdAt expiresOn",
      );
      expect(transactionQuery.limit).toHaveBeenCalledWith(100);
      expect(transactionQuery.lean).toHaveBeenCalledOnce();
      expect(transactionQuery.exec).toHaveBeenCalledOnce();
      expect(response).toMatchObject([
        {
          _id: "txn_1",
          clerkId: "user_123",
          plan: "Pro",
          amount: 19,
        },
      ]);
    });

    it("rejects invalid user identifiers", async () => {
      await expect(getAllTransactions("")).rejects.toThrow(
        "Invalid user identifier.",
      );

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(transactionFindMock).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated reads", async () => {
      mockAuth(vi.mocked(auth), {
        userId: null,
        isAuthenticated: false,
      });

      await expect(getAllTransactions("user_123")).rejects.toThrow(
        "Unauthorized",
      );

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(transactionFindMock).not.toHaveBeenCalled();
    });

    it("enforces ownership and rejects cross-user access", async () => {
      await expect(getAllTransactions("other_user")).rejects.toThrow(
        "Forbidden",
      );

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(transactionFindMock).not.toHaveBeenCalled();
    });
  });
});
