import "server-only";

import type Stripe from "stripe";
import User from "@/lib/database/models/user.model";

type StripeCustomerUser = {
  _id: string;
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string | null;
};

function buildStripeCustomerName(user: StripeCustomerUser): string | undefined {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  if (fullName) {
    return fullName;
  }

  if (user.username && user.username.trim().length > 0) {
    return user.username.trim();
  }

  return undefined;
}

async function persistStripeCustomerId({
  userId,
  clerkId,
  stripeCustomerId,
}: {
  userId: string;
  clerkId: string;
  stripeCustomerId: string;
}): Promise<void> {
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, clerkId },
    {
      $set: {
        stripeCustomerId,
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      strict: true,
      upsert: false,
    },
  );

  if (!updatedUser) {
    throw new Error("User not found");
  }
}

async function createStripeCustomer({
  user,
  stripe,
}: {
  user: StripeCustomerUser;
  stripe: Stripe;
}): Promise<string> {
  const customer = await stripe.customers.create({
    email: user.email,
    name: buildStripeCustomerName(user),
    metadata: {
      userId: user._id,
      clerkId: user.clerkId,
    },
  });

  await persistStripeCustomerId({
    userId: user._id,
    clerkId: user.clerkId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export async function getOrCreateStripeCustomer({
  user,
  stripe,
}: {
  user: StripeCustomerUser;
  stripe: Stripe;
}): Promise<string> {
  const existingCustomerId = user.stripeCustomerId?.trim();

  if (existingCustomerId) {
    try {
      const existingCustomer =
        await stripe.customers.retrieve(existingCustomerId);

      if (!("deleted" in existingCustomer && existingCustomer.deleted)) {
        return existingCustomerId;
      }
    } catch (error) {
      process.stderr.write(
        `[stripe-customer] failed to retrieve customer ${existingCustomerId}: ${
          error instanceof Error ? error.message : "unknown"
        }\n`,
      );
    }
  }

  return createStripeCustomer({ user, stripe });
}
