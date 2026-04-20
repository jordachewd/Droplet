/**
 * Stripe webhook handler for subscription lifecycle events.
 *
 * Handled events:
 * - checkout.session.completed
 * - invoice.paid
 * - invoice.payment_failed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */

import { dispatchStripeWebhookEvent } from "@/lib/utils/stripe/stripe-webhook-handlers";
import {
  createWebhookErrorResponse,
  logStripeWebhookError,
  logStripeWebhookInfo,
  stripeWebhookEventSchema,
} from "@/lib/utils/stripe/stripe-webhook-shared";
import { NextRequest, NextResponse } from "next/server";
import stripe from "stripe";

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    logStripeWebhookInfo("Webhook received.");

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    logStripeWebhookInfo(
      `Body length: ${body.length}, Signature present: ${Boolean(sig)}, Secret configured: ${Boolean(endpointSecret)}`,
    );

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

    logStripeWebhookInfo(
      `Signature verified. Event ID: ${event.id}, Type: ${event.type}`,
    );

    const parsedEvent = stripeWebhookEventSchema.safeParse(event);

    if (!parsedEvent.success) {
      logStripeWebhookError(
        `Invalid Stripe webhook event payload. Zod errors: ${JSON.stringify(parsedEvent.error.issues)}`,
      );
      return createWebhookErrorResponse(400);
    }

    logStripeWebhookInfo(`Event type received: ${parsedEvent.data.type}`);
    const result = await dispatchStripeWebhookEvent({
      event: parsedEvent.data,
    });

    logStripeWebhookInfo(
      `Event ${event.id} (${event.type}) handler returned status ${result.status}.`,
    );
    return result;
  } catch (error) {
    logStripeWebhookError(
      `Unhandled webhook processing error: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return createWebhookErrorResponse(500);
  }
}
