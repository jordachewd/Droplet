"use server";
import "server-only";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { handleError } from "@/lib/utils/handleError";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams } from "@/types/PlanData.d";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { auth } from "@clerk/nextjs/server";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { z } from "zod";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import {
  getEffectiveStripeBillingConfig,
  resolveExpectedCheckoutAmount,
  resolveStripePriceId,
} from "@/lib/utils/effective-stripe-billing-config";
import { getOrCreateStripeCustomer } from "@/lib/utils/stripe-customer";
import { requireEnv } from "@/lib/utils/require-env";

const checkoutPlanSchema = z
  .object({
    plan: z
      .object({
        id: z.number(),
        billing: z.enum(["Monthly", "Yearly"]),
        name: z.enum(["Lite", "Pro", "Premium"]),
        price: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

type CheckoutUserRecord = {
  _id: { toString(): string };
  clerkId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  stripeCustomerId?: string;
};

export async function checkoutPlan(transaction: CheckoutTransactionParams) {
  let redirectUrl: string | undefined;

  try {
    const parsedTransaction = checkoutPlanSchema.safeParse(transaction);
    if (!parsedTransaction.success)
      throw new Error("Invalid checkout payload.");

    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");

    await connectToDatabase();

    const currentUser = await User.findOne(
      { clerkId: authedUserId },
      "_id clerkId firstName lastName username email stripeCustomerId",
      { lean: true },
    );
    if (!currentUser) throw new Error("User not found");
    const typedUser = currentUser as CheckoutUserRecord;
    const normalizedUserId = typedUser._id.toString();

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const BASEURL = requireEnv("NEXT_PUBLIC_API_BASE_URL");

    const {
      id: planId,
      billing: planBilling,
      name: planName,
      price: planPrice,
    }: CheckoutPlanParams = parsedTransaction.data.plan;

    const [{ pricing }, { stripePriceIds, yearlyDiscount }] = await Promise.all(
      [getEffectivePlanConfig(), getEffectiveStripeBillingConfig()],
    );
    const expectedPlanPrice = resolveExpectedCheckoutAmount({
      planName,
      billing: planBilling,
      pricing,
      yearlyDiscount,
    });
    const priceId = resolveStripePriceId({
      planName,
      billing: planBilling,
      stripePriceIds,
    });

    if (expectedPlanPrice !== planPrice || !priceId) {
      throw new Error("Unable to start checkout.");
    }
    const customerId = await getOrCreateStripeCustomer({
      stripe,
      user: {
        _id: normalizedUserId,
        clerkId: typedUser.clerkId,
        firstName: typedUser.firstName,
        lastName: typedUser.lastName,
        username: typedUser.username,
        email: typedUser.email,
        stripeCustomerId: typedUser.stripeCustomerId,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: normalizedUserId,
        clerkId: authedUserId,
        plan: planName,
        billing: planBilling,
        planId: String(planId),
      },
      subscription_data: {
        metadata: {
          userId: normalizedUserId,
          clerkId: authedUserId,
          plan: planName,
          billing: planBilling,
        },
      },
      success_url: `${BASEURL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASEURL}/app/plans`,
    });

    if (!session.url) {
      throw new Error("Unable to start checkout.");
    }

    redirectUrl = session.url;
  } catch (error) {
    handleError({ error, source: "checkoutPlan" });
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }
}

export async function getAllTransactions(userId: string) {
  try {
    const parsedUserId = nonEmptyStringSchema.safeParse(userId);
    if (!parsedUserId.success) throw new Error("Invalid user identifier.");

    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== parsedUserId.data) throw new Error("Forbidden");

    await connectToDatabase();

    const transactions = await Transaction.find(
      { clerkId: parsedUserId.data },
      null,
      {
        sort: {
          createdAt: -1,
        },
      },
    )
      .select("plan amount billing createdAt expiresOn")
      .limit(100)
      .lean()
      .exec();

    return serializeForClient(transactions);
  } catch (error) {
    handleError({ error, source: "getAllTransactions" });
  }
}
