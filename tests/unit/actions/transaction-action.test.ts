import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  checkoutPlan,
  getAllTransactions,
} from "@/lib/actions/transaction.action";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import {
  createTestTransaction,
  createTestUser,
  mockAuth,
} from "../test-support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stripeCreateSessionMock, userFindOneMock, transactionFindMock } =
  vi.hoisted(() => ({
    stripeCreateSessionMock: vi.fn(),
    userFindOneMock: vi.fn(),
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

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: userFindOneMock,
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
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
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
          video: 1,
        },
        Pro: {
          conversationsPerDay: 50,
          promptsPerConversation: 100,
          images: 50,
          audio: 50,
          video: 10,
        },
        Premium: {
          conversationsPerDay: -1,
          promptsPerConversation: -1,
          images: -1,
          audio: -1,
          video: -1,
        },
      },
      trialLimits: {
        promptsPerConversation: 5,
        images: 3,
        audio: 2,
        video: 1,
      },
    });

    stripeCreateSessionMock.mockResolvedValue({
      url: "http://stripe.test/session",
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
        "_id firstName lastName username email",
        { lean: true },
      );
      expect(vi.mocked(getEffectivePlanConfig)).toHaveBeenCalledOnce();
      expect(stripeCreateSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          customer_email: "buyer@example.com",
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
        }),
      );
      expect(redirect).toHaveBeenCalledWith("http://stripe.test/session");
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
