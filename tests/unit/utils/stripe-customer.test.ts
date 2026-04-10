import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindOneAndUpdateMock,
  stripeRetrieveMock,
  stripeCreateMock,
  stderrWriteMock,
} = vi.hoisted(() => ({
  userFindOneAndUpdateMock: vi.fn(),
  stripeRetrieveMock: vi.fn(),
  stripeCreateMock: vi.fn(),
  stderrWriteMock: vi.fn(() => true),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOneAndUpdate: userFindOneAndUpdateMock,
  },
}));

import { getOrCreateStripeCustomer } from "@/lib/utils/stripe-customer";

function createStripeClient() {
  return {
    customers: {
      retrieve: stripeRetrieveMock,
      create: stripeCreateMock,
    },
  } as unknown as Parameters<typeof getOrCreateStripeCustomer>[0]["stripe"];
}

function createUser(
  overrides: Partial<{
    _id: string;
    clerkId: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    stripeCustomerId?: string | null;
  }> = {},
) {
  return {
    _id: "507f1f77bcf86cd799439011",
    clerkId: "clerk_user_123",
    email: "buyer@example.com",
    username: "buyer-name",
    firstName: "Buyer",
    lastName: "One",
    stripeCustomerId: null,
    ...overrides,
  };
}

describe("stripe-customer utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(stderrWriteMock);

    stripeRetrieveMock.mockResolvedValue({
      id: "cus_existing",
      deleted: false,
    });
    stripeCreateMock.mockResolvedValue({
      id: "cus_new_123",
    });
    userFindOneAndUpdateMock.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
    });
  });

  it("returns existing Stripe customer id when retrieve succeeds", async () => {
    const customerId = await getOrCreateStripeCustomer({
      user: createUser({
        stripeCustomerId: "cus_existing",
      }),
      stripe: createStripeClient(),
    });

    expect(customerId).toBe("cus_existing");
    expect(stripeRetrieveMock).toHaveBeenCalledWith("cus_existing");
    expect(stripeCreateMock).not.toHaveBeenCalled();
    expect(userFindOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("trims stripeCustomerId before retrieval", async () => {
    await getOrCreateStripeCustomer({
      user: createUser({
        stripeCustomerId: "  cus_existing  ",
      }),
      stripe: createStripeClient(),
    });

    expect(stripeRetrieveMock).toHaveBeenCalledWith("cus_existing");
  });

  it("creates and persists Stripe customer when no customer id exists", async () => {
    const customerId = await getOrCreateStripeCustomer({
      user: createUser({
        stripeCustomerId: null,
      }),
      stripe: createStripeClient(),
    });

    expect(customerId).toBe("cus_new_123");
    expect(stripeCreateMock).toHaveBeenCalledWith({
      email: "buyer@example.com",
      name: "Buyer One",
      metadata: {
        userId: "507f1f77bcf86cd799439011",
        clerkId: "clerk_user_123",
      },
    });
    expect(userFindOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011", clerkId: "clerk_user_123" },
      {
        $set: {
          stripeCustomerId: "cus_new_123",
          updatedAt: expect.any(Date),
        },
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );
  });

  it("falls back to username as Stripe customer name when first/last are absent", async () => {
    await getOrCreateStripeCustomer({
      user: createUser({
        firstName: undefined,
        lastName: undefined,
        username: "fallback_user",
      }),
      stripe: createStripeClient(),
    });

    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "fallback_user",
      }),
    );
  });

  it("omits Stripe customer name when neither name nor username are available", async () => {
    await getOrCreateStripeCustomer({
      user: createUser({
        firstName: undefined,
        lastName: undefined,
        username: "   ",
      }),
      stripe: createStripeClient(),
    });

    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: undefined,
      }),
    );
  });

  it("creates new customer when existing Stripe customer is deleted", async () => {
    stripeRetrieveMock.mockResolvedValue({
      id: "cus_deleted",
      deleted: true,
    });

    const customerId = await getOrCreateStripeCustomer({
      user: createUser({
        stripeCustomerId: "cus_deleted",
      }),
      stripe: createStripeClient(),
    });

    expect(customerId).toBe("cus_new_123");
    expect(stripeCreateMock).toHaveBeenCalledOnce();
  });

  it("creates new customer when retrieve throws", async () => {
    stripeRetrieveMock.mockRejectedValue(new Error("stripe timeout"));

    const customerId = await getOrCreateStripeCustomer({
      user: createUser({
        stripeCustomerId: "cus_broken",
      }),
      stripe: createStripeClient(),
    });

    expect(customerId).toBe("cus_new_123");
    expect(stderrWriteMock).toHaveBeenCalledWith(
      expect.stringContaining("failed to retrieve customer"),
    );
    expect(stripeCreateMock).toHaveBeenCalledOnce();
  });

  it("throws when user persistence fails after customer creation", async () => {
    userFindOneAndUpdateMock.mockResolvedValueOnce(null);

    await expect(
      getOrCreateStripeCustomer({
        user: createUser(),
        stripe: createStripeClient(),
      }),
    ).rejects.toThrow("User not found");
  });

  it("propagates Stripe create errors", async () => {
    stripeCreateMock.mockRejectedValue(new Error("create failed"));

    await expect(
      getOrCreateStripeCustomer({
        user: createUser({
          stripeCustomerId: null,
        }),
        stripe: createStripeClient(),
      }),
    ).rejects.toThrow("create failed");
  });
});
