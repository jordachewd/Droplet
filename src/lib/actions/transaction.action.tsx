"use server";
import "server-only";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { handleError } from "@/lib/utils/handleError";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { type CheckoutPlanParams, type PlanData } from "@/types/PlanData.d";
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

type ManagedSubscriptionUserRecord = {
  _id: { toString(): string };
  clerkId: string;
  role: "client" | "admin";
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: PlanData["subscriptionStatus"];
  plan?: {
    name?: PlanData["name"];
    expiresOn?: Date;
    cancelAtPeriodEnd?: boolean;
  } | null;
};

type SubscriptionActionSeverity = "success" | "warning" | "error";

export type SubscriptionActionResponse = {
  status: number;
  message: string;
  severity: SubscriptionActionSeverity;
  subscriptionStatus?: PlanData["subscriptionStatus"];
  cancelAtPeriodEnd?: boolean;
};

function normalizeStripeSubscriptionStatus(
  status: string,
): PlanData["subscriptionStatus"] {
  if (status === "trialing") {
    return "active";
  }

  if (
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid"
  ) {
    return status;
  }

  return "unpaid";
}

function buildSubscriptionActionResponse({
  status,
  message,
  severity,
  subscriptionStatus,
  cancelAtPeriodEnd,
}: SubscriptionActionResponse): SubscriptionActionResponse {
  return {
    status,
    message,
    severity,
    subscriptionStatus,
    cancelAtPeriodEnd,
  };
}

function logSubscriptionActionError(context: string, error: unknown): void {
  process.stderr.write(
    `[transaction.action] ${context}: ${
      error instanceof Error ? error.message : "unknown"
    }\n`,
  );
}

async function updateSubscriptionCancellationPreference(
  cancelAtPeriodEnd: boolean,
): Promise<SubscriptionActionResponse> {
  const actionLabel = cancelAtPeriodEnd
    ? "cancelSubscriptionAction"
    : "reactivateSubscriptionAction";

  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) {
      return buildSubscriptionActionResponse({
        status: 401,
        message: "Unauthorized.",
        severity: "error",
      });
    }

    await connectToDatabase();

    const currentUser = (await User.findOne(
      { clerkId: authedUserId },
      "clerkId role stripeSubscriptionId subscriptionStatus plan",
      { lean: true },
    )) as ManagedSubscriptionUserRecord | null;

    if (!currentUser) {
      return buildSubscriptionActionResponse({
        status: 404,
        message: "User not found.",
        severity: "error",
      });
    }

    if (currentUser.role === "admin") {
      return buildSubscriptionActionResponse({
        status: 403,
        message: "Admin accounts do not use paid subscription cancellation.",
        severity: "warning",
      });
    }

    if (!currentUser.stripeSubscriptionId) {
      return buildSubscriptionActionResponse({
        status: 404,
        message: "No active paid subscription was found.",
        severity: "warning",
      });
    }

    const existingCancelAtPeriodEnd =
      currentUser.plan?.cancelAtPeriodEnd === true;

    if (currentUser.subscriptionStatus === "canceled") {
      return buildSubscriptionActionResponse({
        status: 409,
        message: "Subscription is already canceled.",
        severity: "warning",
        subscriptionStatus: "canceled",
        cancelAtPeriodEnd: false,
      });
    }

    if (cancelAtPeriodEnd && existingCancelAtPeriodEnd) {
      return buildSubscriptionActionResponse({
        status: 200,
        message: "Cancellation is already scheduled for period end.",
        severity: "warning",
        subscriptionStatus: currentUser.subscriptionStatus,
        cancelAtPeriodEnd: true,
      });
    }

    if (!cancelAtPeriodEnd && !existingCancelAtPeriodEnd) {
      return buildSubscriptionActionResponse({
        status: 200,
        message: "Subscription is already set to renew automatically.",
        severity: "warning",
        subscriptionStatus: currentUser.subscriptionStatus,
        cancelAtPeriodEnd: false,
      });
    }

    const stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const updatedSubscription = await stripeClient.subscriptions.update(
      currentUser.stripeSubscriptionId,
      {
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    );

    const normalizedStatus = normalizeStripeSubscriptionStatus(
      updatedSubscription.status,
    );
    const resolvedCancelAtPeriodEnd = Boolean(
      updatedSubscription.cancel_at_period_end,
    );
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
      stripeSubscriptionId: updatedSubscription.id,
      subscriptionStatus: normalizedStatus,
      "plan.cancelAtPeriodEnd": resolvedCancelAtPeriodEnd,
    };

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: currentUser._id.toString(),
        clerkId: currentUser.clerkId,
      },
      {
        $set: updateFields,
      },
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!updatedUser) {
      return buildSubscriptionActionResponse({
        status: 404,
        message: "User not found.",
        severity: "error",
      });
    }

    revalidatePath("/app/profile");
    revalidatePath("/app/plans");

    if (cancelAtPeriodEnd) {
      if (normalizedStatus === "past_due") {
        return buildSubscriptionActionResponse({
          status: 200,
          message:
            "Subscription is past due and now scheduled to cancel at period end.",
          severity: "warning",
          subscriptionStatus: normalizedStatus,
          cancelAtPeriodEnd: resolvedCancelAtPeriodEnd,
        });
      }

      return buildSubscriptionActionResponse({
        status: 200,
        message:
          "Subscription cancellation is scheduled for the end of this billing period.",
        severity: "success",
        subscriptionStatus: normalizedStatus,
        cancelAtPeriodEnd: resolvedCancelAtPeriodEnd,
      });
    }

    if (normalizedStatus === "past_due") {
      return buildSubscriptionActionResponse({
        status: 200,
        message:
          "Scheduled cancellation removed, but the subscription is still past due.",
        severity: "warning",
        subscriptionStatus: normalizedStatus,
        cancelAtPeriodEnd: resolvedCancelAtPeriodEnd,
      });
    }

    return buildSubscriptionActionResponse({
      status: 200,
      message:
        "Scheduled cancellation removed. Subscription will renew normally.",
      severity: "success",
      subscriptionStatus: normalizedStatus,
      cancelAtPeriodEnd: resolvedCancelAtPeriodEnd,
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (errorCode === "resource_missing") {
      logSubscriptionActionError(actionLabel, error);
      return buildSubscriptionActionResponse({
        status: 404,
        message: "Subscription could not be found in the billing provider.",
        severity: "error",
      });
    }

    logSubscriptionActionError(actionLabel, error);
    return buildSubscriptionActionResponse({
      status: 500,
      message: "Unable to update subscription right now. Please try again.",
      severity: "error",
    });
  }
}

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

export async function cancelSubscriptionAction(): Promise<SubscriptionActionResponse> {
  return updateSubscriptionCancellationPreference(true);
}

export async function reactivateSubscriptionAction(): Promise<SubscriptionActionResponse> {
  return updateSubscriptionCancellationPreference(false);
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
      .select("plan amount billing createdAt expiresOn stripeId")
      .limit(100)
      .lean()
      .exec();

    return serializeForClient(transactions);
  } catch (error) {
    handleError({ error, source: "getAllTransactions" });
  }
}
