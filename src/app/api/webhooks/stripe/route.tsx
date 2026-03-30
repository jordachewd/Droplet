/**
 * This file contains the route handler for Stripe webhooks.
 * It listens for POST requests from Stripe and processes events such as "checkout.session.completed".
 *
 * Params:
 * - request: The incoming HTTP request object containing the Stripe event payload and headers.
 *
 * Returns:
 * - A JSON response indicating the result of the webhook processing.
 * - In case of a successful "checkout.session.completed" event, it returns a generic success response.
 * - In case of an error, it returns a JSON response with an error message.
 */

import { getExpiresOn } from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { BillingCycle, PlanData, PlanName } from "@/types/PlanData.d";
import { CreateTransactionParams } from "@/types/TransactionData.d";
import { UpdateUserParams } from "@/types/UserData.d";
import { NextRequest, NextResponse } from "next/server";
import stripe from "stripe";
import { z } from "zod";

const ALLOWED_PLAN_NAMES: readonly PlanName[] = ["Lite", "Pro", "Premium"];
const ALLOWED_BILLING_CYCLES: readonly BillingCycle[] = ["Monthly", "Yearly"];
const WEBHOOK_FAILURE_MESSAGE = "Webhook processing failed";

const stripeWebhookEventSchema = z
  .object({
    type: nonEmptyStringSchema,
    data: z
      .object({
        object: z.unknown(),
      })
      .passthrough(),
  })
  .passthrough();

const checkoutSessionMetadataSchema = z
  .object({
    userId: nonEmptyStringSchema,
    clerkId: nonEmptyStringSchema,
    planId: nonEmptyStringSchema,
    plan: z.enum(ALLOWED_PLAN_NAMES),
    billing: z.enum(ALLOWED_BILLING_CYCLES),
  })
  .strip();

const checkoutSessionPayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    amount_total: z.number().nullable().optional(),
    metadata: checkoutSessionMetadataSchema,
  })
  .passthrough();

type CheckoutSessionPayload = z.infer<typeof checkoutSessionPayloadSchema>;

function logStripeWebhookError(message: string) {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

function logStripeWebhookInfo(message: string) {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

function createWebhookErrorResponse(status: 400 | 500) {
  return NextResponse.json(
    {
      message: "Webhook error",
      error: WEBHOOK_FAILURE_MESSAGE,
    },
    { status },
  );
}

async function createTransaction(transaction: CreateTransactionParams) {
  try {
    const newTransaction = await Transaction.create(transaction);

    return serializeForClient(newTransaction);
  } catch (error) {
    logStripeWebhookError(
      `Failed to create transaction for session ${transaction.stripeId} and user ${transaction.userId}: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return null;
  }
}

async function applyCheckoutPlanUpdate({
  userId,
  clerkId,
  userUpdateData,
  sessionId,
}: {
  userId: string;
  clerkId: string;
  userUpdateData: UpdateUserParams;
  sessionId: string;
}): Promise<boolean> {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, clerkId },
      userUpdateData,
      {
        returnDocument: "after",
        strict: true,
        upsert: false,
      },
    );

    if (!updatedUser) {
      logStripeWebhookError(
        `Failed to update user plan for session ${sessionId} and user ${userId}.`,
      );
      return false;
    }

    return true;
  } catch (error) {
    logStripeWebhookError(
      `User plan update failed for session ${sessionId} and user ${userId}: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return false;
  }
}

function hasExpectedStripePlan({
  userPlanStripeId,
  sessionId,
}: {
  userPlanStripeId?: string | null;
  sessionId: string;
}): boolean {
  return userPlanStripeId === sessionId;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let checkoutSessionId = "unknown";

  try {
    logStripeWebhookInfo("Webhook received.");

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      logStripeWebhookError("Missing stripe-signature header.");
      return createWebhookErrorResponse(400);
    }

    if (!endpointSecret) {
      logStripeWebhookError("Missing STRIPE_WEBHOOK_SECRET.");
      return createWebhookErrorResponse(500);
    }

    let event: stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (error) {
      logStripeWebhookError(
        `Invalid webhook signature: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      return createWebhookErrorResponse(400);
    }

    const parsedEvent = stripeWebhookEventSchema.safeParse(event);

    if (!parsedEvent.success) {
      logStripeWebhookError("Invalid Stripe webhook event payload.");
      return createWebhookErrorResponse(400);
    }

    const eventType = parsedEvent.data.type;

    if (eventType === "checkout.session.completed") {
      const parsedSessionPayload = checkoutSessionPayloadSchema.safeParse(
        event.data.object,
      );

      if (!parsedSessionPayload.success) {
        logStripeWebhookError("Checkout session metadata is invalid.");
        return createWebhookErrorResponse(400);
      }

      const {
        id,
        amount_total,
        metadata: {
          userId: theUserId,
          clerkId: theClerkId,
          planId: thePlanId,
          plan: normalizedPlanName,
          billing: normalizedBillingCycle,
        },
      }: CheckoutSessionPayload = parsedSessionPayload.data;
      checkoutSessionId = id;
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
          imageGenerations: 0,
          audioGenerations: 0,
          videoGenerations: 0,
          usagePeriodStart: new Date(),
        } as PlanData,
      };

      await connectToDatabase();

      const existingUser = await User.findOne(
        {
          _id: theUserId,
          clerkId: theClerkId,
        },
        "_id clerkId plan.stripeId",
        { lean: true },
      );

      if (!existingUser) {
        logStripeWebhookError(
          `Checkout session ${id} could not be matched to user ${theUserId}.`,
        );
        return createWebhookErrorResponse(400);
      }

      const existingTransaction = await Transaction.findOne(
        { stripeId: id },
        "_id",
        { lean: true },
      );

      const existingUserPlanStripeId =
        (existingUser as { plan?: { stripeId?: string | null } }).plan
          ?.stripeId ?? null;

      if (existingTransaction) {
        if (
          hasExpectedStripePlan({
            userPlanStripeId: existingUserPlanStripeId,
            sessionId: id,
          })
        ) {
          return NextResponse.json(
            { message: "Already processed" },
            { status: 200 },
          );
        }

        logStripeWebhookInfo(
          `Repairing user plan state for replayed session ${id} and user ${theUserId}.`,
        );
        const repairedPlanUpdate = await applyCheckoutPlanUpdate({
          userId: theUserId,
          clerkId: theClerkId,
          userUpdateData: newUserData,
          sessionId: id,
        });

        if (!repairedPlanUpdate) {
          return createWebhookErrorResponse(500);
        }

        return NextResponse.json({ message: "OK" });
      }

      const newTransaction = await createTransaction(transaction);

      if (!newTransaction) {
        logStripeWebhookError(
          `Transaction creation returned null for session ${id} and user ${theUserId}.`,
        );
        return createWebhookErrorResponse(500);
      }

      const updatedPlan = await applyCheckoutPlanUpdate({
        userId: theUserId,
        clerkId: theClerkId,
        userUpdateData: newUserData,
        sessionId: id,
      });

      if (!updatedPlan) {
        return createWebhookErrorResponse(500);
      }

      return NextResponse.json({ message: "OK" });
    }

    logStripeWebhookError(`Unhandled Stripe event type: ${eventType}`);

    return NextResponse.json({ message: "Unhandled event" }, { status: 200 });
  } catch (error) {
    logStripeWebhookError(
      `Unhandled webhook processing error for session ${checkoutSessionId}: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return createWebhookErrorResponse(500);
  }
}
