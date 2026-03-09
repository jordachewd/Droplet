/**
 * This file contains the route handler for Stripe webhooks.
 * It listens for POST requests from Stripe and processes events such as "checkout.session.completed".
 *
 * Params:
 * - request: The incoming HTTP request object containing the Stripe event payload and headers.
 *
 * Returns:
 * - A JSON response indicating the result of the webhook processing.
 * - In case of a successful "checkout.session.completed" event, it returns the created transaction and updated user data.
 * - In case of an error, it returns a JSON response with an error message.
 */

import { getExpiresOn } from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { BillingCycle, PlanData, PlanName } from "@/types/PlanData.d";
import { CreateTransactionParams } from "@/types/TransactionData.d";
import { UpdateUserParams } from "@/types/UserData.d";
import { NextRequest, NextResponse } from "next/server";
import stripe from "stripe";

const ALLOWED_PLAN_NAMES: readonly PlanName[] = ["Lite", "Pro", "Premium"];
const ALLOWED_BILLING_CYCLES: readonly BillingCycle[] = ["Monthly", "Yearly"];

async function createTransaction(transaction: CreateTransactionParams) {
  try {
    const newTransaction = await Transaction.create(transaction);

    return serializeForClient(newTransaction);
  } catch (error) {
    console.error("Stripe webhook failed to create transaction", {
      stripeId: transaction.stripeId,
      clerkId: transaction.clerkId,
      userId: transaction.userId,
      error,
    });

    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return NextResponse.json(
      { message: "Webhook error", error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  if (!endpointSecret) {
    return NextResponse.json(
      { message: "Webhook error", error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch {
    return NextResponse.json(
      {
        message: "Webhook error",
        error: "Invalid webhook signature",
      },
      { status: 400 },
    );
  }

  // Get the ID and type
  const eventType = event.type;

  // CREATE
  if (eventType === "checkout.session.completed") {
    const { id, amount_total, metadata } = event.data.object;
    const theUserId = metadata?.userId;
    const theClerkId = metadata?.clerkId;
    const thePlanId = metadata?.planId?.toString();
    const thePlanName = metadata?.plan;
    const theBillingCycle = metadata?.billing;

    if (
      !theUserId ||
      !theClerkId ||
      !thePlanId ||
      !thePlanName ||
      !theBillingCycle ||
      !ALLOWED_PLAN_NAMES.includes(thePlanName as PlanName) ||
      !ALLOWED_BILLING_CYCLES.includes(theBillingCycle as BillingCycle)
    ) {
      console.error("Stripe webhook missing required checkout metadata", {
        stripeId: id,
      });

      return NextResponse.json(
        {
          message: "Webhook error",
          error: "Checkout session metadata is invalid",
        },
        { status: 400 },
      );
    }

    const normalizedPlanName = thePlanName as PlanName;
    const normalizedBillingCycle = theBillingCycle as BillingCycle;
    const theAmount = amount_total ? amount_total / 100 : 0;
    const theExpireDate = getExpiresOn(
      normalizedPlanName,
      normalizedBillingCycle,
    );

    const transaction: CreateTransactionParams = {
      stripeId: id,
      userId: theUserId,
      clerkId: theClerkId,
      createdAt: new Date(),
      expiresOn: theExpireDate,
      amount: theAmount,
      plan: normalizedPlanName,
      billing: normalizedBillingCycle,
    };

    // Idempotency: check if this Stripe event was already processed
    await connectToDatabase();
    const existingTransaction = await Transaction.findOne({ stripeId: id });
    if (existingTransaction) {
      return NextResponse.json(
        { message: "Already processed" },
        { status: 200 },
      );
    }

    const existingUser = await User.findOne({
      _id: theUserId,
      clerkId: theClerkId,
    });

    if (!existingUser) {
      console.error(
        "Stripe webhook could not match checkout session to a user",
        {
          stripeId: id,
          clerkId: theClerkId,
          userId: theUserId,
        },
      );

      return NextResponse.json(
        {
          message: "Webhook error",
          error: "Checkout session could not be matched to a user",
        },
        { status: 400 },
      );
    }

    // Create transaction in database
    const newTransaction = await createTransaction(transaction);

    if (newTransaction) {
      const newUserData: UpdateUserParams = {
        updatedAt: new Date(),
        plan: {
          id: thePlanId,
          name: normalizedPlanName,
          billing: normalizedBillingCycle,
          startedOn: new Date(),
          expiresOn: theExpireDate,
          amount: theAmount,
          stripeId: id,
        } as PlanData,
      };

      // Update user in database
      const updatedUser = await User.findOneAndUpdate(
        { _id: existingUser._id, clerkId: theClerkId },
        newUserData,
        {
          new: true,
          strict: true,
        },
      );

      if (!updatedUser) {
        console.error("Stripe webhook failed to update user plan", {
          stripeId: id,
          clerkId: theClerkId,
          userId: theUserId,
        });

        return NextResponse.json(
          {
            message: "Webhook error",
            error: "Failed to update the checkout user",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "OK", newTransaction, updatedUser });
    } else {
      return NextResponse.json(
        {
          message: "STRIPE: Transaction failed!",
          newTransaction,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { message: `STRIPE: Unhandled event type: ${eventType}` },
    { status: 200 },
  );
}
