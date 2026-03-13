import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { checkoutPlan } from "@/lib/actions/transaction.action";

const createSessionMock = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  const StripeMock = vi.fn(function StripeMock() {
    return {
      checkout: {
        sessions: {
          create: createSessionMock,
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
    findOne: vi.fn(),
  },
}));

describe("checkoutPlan phase17", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_123" } as never);
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as never);
    vi.mocked(User.findOne).mockResolvedValue({
      _id: { toString: () => "mongo_user_1" },
      email: "user@example.com",
      username: "tester",
      firstName: "Test",
      lastName: "User",
    } as never);
    createSessionMock.mockResolvedValue({ url: "http://stripe.test/session" });
  });

  it("uses the migrated success and cancel routes", async () => {
    await checkoutPlan({
      plan: {
        id: 1,
        billing: "Monthly",
        name: "Pro",
        price: 19,
      },
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "http://localhost:3000/checkout-success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3000/app/plans",
      }),
    );
    expect(redirect).toHaveBeenCalledWith("http://stripe.test/session");
  });
});
