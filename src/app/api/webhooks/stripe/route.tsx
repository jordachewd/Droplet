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

import { getExpiresOn } from "@/constants/plans";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import {
  getEffectiveStripeBillingConfig,
  type StripePriceIds,
} from "@/lib/utils/effective-stripe-billing-config";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import {
  BillingCycle,
  PlanData,
  PlanName,
  SubscriptionStatus,
} from "@/types/PlanData.d";
import { CreateTransactionParams } from "@/types/TransactionData.d";
import { NextRequest, NextResponse } from "next/server";
import stripe from "stripe";
import { z } from "zod";

export const maxDuration = 60;

const ALLOWED_PLAN_NAMES: readonly PlanName[] = ["Lite", "Pro", "Premium"];
const ALLOWED_BILLING_CYCLES: readonly BillingCycle[] = ["Monthly", "Yearly"];
const ALLOWED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "past_due",
  "canceled",
  "unpaid",
];
const WEBHOOK_FAILURE_MESSAGE = "Webhook processing failed";

const PLAN_ID_BY_NAME: Record<PlanName, string> = {
  Lite: "0",
  Pro: "1",
  Premium: "2",
};

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

const expandableIdSchema = z.union([
  nonEmptyStringSchema,
  z
    .object({
      id: nonEmptyStringSchema,
    })
    .passthrough(),
]);

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
    subscription: expandableIdSchema.optional(),
    metadata: checkoutSessionMetadataSchema,
  })
  .passthrough();

const checkoutSessionCompletedEventSchema = z
  .object({
    type: z.literal("checkout.session.completed"),
    data: z
      .object({
        object: checkoutSessionPayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

const invoiceSubscriptionMetadataSchema = z
  .object({
    userId: nonEmptyStringSchema.optional(),
    clerkId: nonEmptyStringSchema.optional(),
    plan: z.enum(ALLOWED_PLAN_NAMES).optional(),
    billing: z.enum(ALLOWED_BILLING_CYCLES).optional(),
  })
  .strip();

const stripePricePayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    unit_amount: z.number().nullable().optional(),
    recurring: z
      .object({
        interval: z.enum(["day", "week", "month", "year"]).optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

const invoiceLineItemSchema = z
  .object({
    price: stripePricePayloadSchema.optional(),
  })
  .passthrough();

const invoicePayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    amount_paid: z.number().nullable().optional(),
    customer: expandableIdSchema.optional(),
    subscription: expandableIdSchema.optional(),
    subscription_details: z
      .object({
        metadata: invoiceSubscriptionMetadataSchema.optional(),
      })
      .passthrough()
      .optional(),
    parent: z
      .object({
        subscription_details: z
          .object({
            metadata: invoiceSubscriptionMetadataSchema.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    lines: z
      .object({
        data: z.array(invoiceLineItemSchema),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const invoicePaidEventSchema = z
  .object({
    type: z.literal("invoice.paid"),
    data: z
      .object({
        object: invoicePayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

const invoicePaymentFailedEventSchema = z
  .object({
    type: z.literal("invoice.payment_failed"),
    data: z
      .object({
        object: invoicePayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

const subscriptionItemSchema = z
  .object({
    price: stripePricePayloadSchema.optional(),
  })
  .passthrough();

const subscriptionPayloadSchema = z
  .object({
    id: nonEmptyStringSchema,
    status: nonEmptyStringSchema,
    cancel_at_period_end: z.boolean().optional(),
    customer: expandableIdSchema.optional(),
    current_period_end: z.number().optional(),
    metadata: invoiceSubscriptionMetadataSchema.optional(),
    items: z
      .object({
        data: z.array(subscriptionItemSchema),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const customerSubscriptionUpdatedEventSchema = z
  .object({
    type: z.literal("customer.subscription.updated"),
    data: z
      .object({
        object: subscriptionPayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

const customerSubscriptionDeletedEventSchema = z
  .object({
    type: z.literal("customer.subscription.deleted"),
    data: z
      .object({
        object: subscriptionPayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;
type CheckoutSessionPayload = z.infer<typeof checkoutSessionPayloadSchema>;
type InvoicePayload = z.infer<typeof invoicePayloadSchema>;
type SubscriptionPayload = z.infer<typeof subscriptionPayloadSchema>;
type StripePricePayload = z.infer<typeof stripePricePayloadSchema>;

interface WebhookPlanUsageRecord {
  trialImageGenerations?: number;
  trialAudioGenerations?: number;
  trialUsagePeriodStart?: Date;
}

interface WebhookUserPlanRecord {
  id?: string | number;
  name?: PlanName;
  billing?: BillingCycle;
  amount?: number;
  startedOn?: Date;
  expiresOn?: Date;
  stripeId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  cancelAtPeriodEnd?: boolean;
  imageGenerations?: number;
  audioGenerations?: number;
  usagePeriodStart?: Date;
  trialUsage?: WebhookPlanUsageRecord;
}

interface WebhookUserRecord {
  _id: string | { toString(): string };
  clerkId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  plan?: WebhookUserPlanRecord | null;
}

type TransactionClaimStatus = "created" | "existing" | "error";
type UserUpdateStatus = "updated" | "not_matched" | "error";

function logStripeWebhookError(message: string): void {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

function logStripeWebhookInfo(message: string): void {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

function createWebhookErrorResponse(status: 400 | 500): NextResponse {
  return NextResponse.json(
    {
      message: "Webhook error",
      error: WEBHOOK_FAILURE_MESSAGE,
    },
    { status },
  );
}

function toStringId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

function resolveExpandableId(
  value: z.infer<typeof expandableIdSchema> | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id;
}

function centsToAmount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value / 100;
}

function intervalToBillingCycle(
  interval: "day" | "week" | "month" | "year" | undefined,
): BillingCycle | null {
  if (interval === "month") {
    return "Monthly";
  }

  if (interval === "year") {
    return "Yearly";
  }

  return null;
}

function normalizeSubscriptionStatus(status: string): SubscriptionStatus {
  if (ALLOWED_SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus)) {
    return status as SubscriptionStatus;
  }

  if (status === "trialing") {
    return "active";
  }

  if (status === "past_due") {
    return "past_due";
  }

  if (status === "canceled") {
    return "canceled";
  }

  return "unpaid";
}

function resolvePlanAndBillingFromPriceId({
  priceId,
  stripePriceIds,
}: {
  priceId: string | null;
  stripePriceIds: StripePriceIds;
}): { planName: PlanName; billing: BillingCycle } | null {
  if (!priceId) {
    return null;
  }

  if (priceId === stripePriceIds.proMonthly) {
    return { planName: "Pro", billing: "Monthly" };
  }

  if (priceId === stripePriceIds.proYearly) {
    return { planName: "Pro", billing: "Yearly" };
  }

  if (priceId === stripePriceIds.premiumMonthly) {
    return { planName: "Premium", billing: "Monthly" };
  }

  if (priceId === stripePriceIds.premiumYearly) {
    return { planName: "Premium", billing: "Yearly" };
  }

  return null;
}

function pickInvoiceLinePrice(
  payload: InvoicePayload,
): StripePricePayload | null {
  const lineItems = payload.lines?.data ?? [];

  for (const lineItem of lineItems) {
    if (lineItem.price?.id) {
      return lineItem.price;
    }
  }

  return null;
}

function resolveInvoiceSubscriptionMetadata(
  payload: InvoicePayload,
): z.infer<typeof invoiceSubscriptionMetadataSchema> | null {
  if (payload.subscription_details?.metadata) {
    return payload.subscription_details.metadata;
  }

  if (payload.parent?.subscription_details?.metadata) {
    return payload.parent.subscription_details.metadata;
  }

  return null;
}

function resolvePlanId(
  planName: PlanName,
  existingPlanId?: string | number,
): string {
  if (typeof existingPlanId === "string" && existingPlanId.trim().length > 0) {
    return existingPlanId;
  }

  if (typeof existingPlanId === "number" && Number.isFinite(existingPlanId)) {
    return String(existingPlanId);
  }

  return PLAN_ID_BY_NAME[planName];
}

function resolveSubscriptionPeriodEndDate(
  unixTimestampSeconds?: number,
  fallbackPlanName?: PlanName,
  fallbackBilling?: BillingCycle,
): Date {
  if (
    typeof unixTimestampSeconds === "number" &&
    Number.isFinite(unixTimestampSeconds) &&
    unixTimestampSeconds > 0
  ) {
    return new Date(unixTimestampSeconds * 1000);
  }

  if (fallbackPlanName && fallbackBilling) {
    return getExpiresOn(fallbackPlanName, fallbackBilling);
  }

  return new Date();
}

async function findWebhookUser({
  metadataUserId,
  metadataClerkId,
  stripeSubscriptionId,
  stripeCustomerId,
}: {
  metadataUserId?: string;
  metadataClerkId?: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
}): Promise<WebhookUserRecord | null> {
  const projection =
    "_id clerkId stripeCustomerId stripeSubscriptionId subscriptionStatus plan";

  if (metadataUserId && metadataClerkId) {
    const user = (await User.findOne(
      {
        _id: metadataUserId,
        clerkId: metadataClerkId,
      },
      projection,
      { lean: true },
    )) as WebhookUserRecord | null;

    if (user) {
      return user;
    }
  }

  if (stripeSubscriptionId) {
    const user = (await User.findOne({ stripeSubscriptionId }, projection, {
      lean: true,
    })) as WebhookUserRecord | null;

    if (user) {
      return user;
    }
  }

  if (stripeCustomerId) {
    const user = (await User.findOne({ stripeCustomerId }, projection, {
      lean: true,
    })) as WebhookUserRecord | null;

    if (user) {
      return user;
    }
  }

  return null;
}

async function claimTransaction({
  filter,
  transaction,
  context,
}: {
  filter: Record<string, unknown>;
  transaction: CreateTransactionParams;
  context: string;
}): Promise<TransactionClaimStatus> {
  try {
    const existingTransaction = await Transaction.findOneAndUpdate(
      filter,
      {
        $setOnInsert: transaction,
      },
      {
        upsert: true,
        strict: true,
        returnDocument: "before",
      },
    );

    if (existingTransaction) {
      return "existing";
    }

    return "created";
  } catch (error) {
    logStripeWebhookError(
      `${context} transaction claim failed: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return "error";
  }
}

async function updateUserWithGuard({
  filter,
  update,
  context,
}: {
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
  context: string;
}): Promise<UserUpdateStatus> {
  try {
    const updatedUser = await User.findOneAndUpdate(filter, update, {
      returnDocument: "after",
      strict: true,
      upsert: false,
    });

    if (!updatedUser) {
      return "not_matched";
    }

    return "updated";
  } catch (error) {
    logStripeWebhookError(
      `${context} user update failed: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return "error";
  }
}

async function handleCheckoutSessionCompleted(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = checkoutSessionCompletedEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError("Checkout session metadata is invalid.");
    return createWebhookErrorResponse(400);
  }

  const parsedSession: CheckoutSessionPayload = parsedEvent.data.data.object;
  const subscriptionId = resolveExpandableId(parsedSession.subscription);

  if (!subscriptionId) {
    logStripeWebhookError(
      `Checkout session ${parsedSession.id} is missing subscription id.`,
    );
    return createWebhookErrorResponse(400);
  }

  const {
    id: checkoutSessionId,
    amount_total,
    metadata: {
      userId: metadataUserId,
      clerkId: metadataClerkId,
      planId: metadataPlanId,
      plan: metadataPlanName,
      billing: metadataBilling,
    },
  } = parsedSession;

  await connectToDatabase();

  const existingUser = (await User.findOne(
    {
      _id: metadataUserId,
      clerkId: metadataClerkId,
    },
    "_id clerkId plan stripeSubscriptionId subscriptionStatus",
    { lean: true },
  )) as WebhookUserRecord | null;

  if (!existingUser) {
    logStripeWebhookError(
      `Checkout session ${checkoutSessionId} could not be matched to user ${metadataUserId}.`,
    );
    return createWebhookErrorResponse(400);
  }

  const now = new Date();
  const amount = centsToAmount(amount_total);
  const expiresOn = getExpiresOn(metadataPlanName, metadataBilling);
  const planData: PlanData = {
    id: metadataPlanId,
    name: metadataPlanName,
    billing: metadataBilling,
    startedOn: now,
    expiresOn,
    amount,
    stripeId: checkoutSessionId,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: "active",
    cancelAtPeriodEnd: false,
    imageGenerations: 0,
    audioGenerations: 0,
    usagePeriodStart: now,
    trialUsage: existingUser.plan?.trialUsage,
  };

  const transaction: CreateTransactionParams = {
    stripeId: checkoutSessionId,
    userId: toStringId(existingUser._id),
    clerkId: metadataClerkId,
    createdAt: now,
    expiresOn,
    amount,
    plan: metadataPlanName,
    billing: metadataBilling,
    type: "subscription_initial",
  };

  const transactionClaim = await claimTransaction({
    filter: { stripeId: checkoutSessionId },
    transaction,
    context: `checkout.session.completed ${checkoutSessionId}`,
  });

  if (transactionClaim === "error") {
    return createWebhookErrorResponse(500);
  }

  if (transactionClaim === "existing") {
    const replayGuardConditions: Record<string, unknown>[] = [
      { "plan.stripeId": { $ne: checkoutSessionId } },
      { stripeSubscriptionId: { $ne: subscriptionId } },
      { subscriptionStatus: { $ne: "active" } },
      { "plan.cancelAtPeriodEnd": { $ne: false } },
      { "plan.name": { $ne: metadataPlanName } },
      { "plan.billing": { $ne: metadataBilling } },
      { "plan.amount": { $ne: amount } },
    ];

    const replayUpdateResult = await updateUserWithGuard({
      filter: {
        _id: metadataUserId,
        clerkId: metadataClerkId,
        $or: replayGuardConditions,
      },
      update: {
        $set: {
          updatedAt: now,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
          plan: planData,
        },
      },
      context: `checkout.session.completed replay ${checkoutSessionId}`,
    });

    if (replayUpdateResult === "error") {
      return createWebhookErrorResponse(500);
    }

    if (replayUpdateResult === "updated") {
      logStripeWebhookInfo(
        `Checkout session ${checkoutSessionId}: replay repaired user state.`,
      );
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    logStripeWebhookInfo(
      `Checkout session ${checkoutSessionId}: Already processed.`,
    );
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  const newUpdateResult = await updateUserWithGuard({
    filter: {
      _id: metadataUserId,
      clerkId: metadataClerkId,
    },
    update: {
      $set: {
        updatedAt: now,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        plan: planData,
      },
    },
    context: `checkout.session.completed ${checkoutSessionId}`,
  });

  if (newUpdateResult !== "updated") {
    logStripeWebhookError(
      `Checkout session ${checkoutSessionId}: failed to update user ${metadataUserId}.`,
    );
    return createWebhookErrorResponse(500);
  }

  logStripeWebhookInfo(`Checkout session ${checkoutSessionId}: processed.`);
  return NextResponse.json({ message: "OK" }, { status: 200 });
}

async function resolveStripePlanFromPrice(priceId: string | null): Promise<{
  planName: PlanName;
  billing: BillingCycle;
} | null> {
  if (!priceId) {
    return null;
  }

  const { stripePriceIds } = await getEffectiveStripeBillingConfig();
  return resolvePlanAndBillingFromPriceId({ priceId, stripePriceIds });
}

async function handleInvoicePaid(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = invoicePaidEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError("invoice.paid payload is invalid.");
    return createWebhookErrorResponse(400);
  }

  const payload: InvoicePayload = parsedEvent.data.data.object;
  const invoiceId = payload.id;
  const subscriptionId = resolveExpandableId(payload.subscription);
  const customerId = resolveExpandableId(payload.customer);
  const invoiceMetadata = resolveInvoiceSubscriptionMetadata(payload);

  await connectToDatabase();

  const user = await findWebhookUser({
    metadataUserId: invoiceMetadata?.userId,
    metadataClerkId: invoiceMetadata?.clerkId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
  });

  if (!user) {
    logStripeWebhookError(
      `invoice.paid ${invoiceId} could not be matched to any user.`,
    );
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }

  const linePrice = pickInvoiceLinePrice(payload);
  const planFromPrice = await resolveStripePlanFromPrice(linePrice?.id ?? null);
  const inferredBillingFromInterval = intervalToBillingCycle(
    linePrice?.recurring?.interval,
  );

  const normalizedPlanName =
    planFromPrice?.planName ??
    invoiceMetadata?.plan ??
    user.plan?.name ??
    "Lite";
  const normalizedBilling: BillingCycle =
    planFromPrice?.billing ??
    invoiceMetadata?.billing ??
    inferredBillingFromInterval ??
    user.plan?.billing ??
    "Monthly";
  const now = new Date();
  const amountFromPrice = centsToAmount(linePrice?.unit_amount);
  const amount =
    payload.amount_paid != null
      ? centsToAmount(payload.amount_paid)
      : amountFromPrice > 0
        ? amountFromPrice
        : (user.plan?.amount ?? 0);
  const expiresOn = getExpiresOn(normalizedPlanName, normalizedBilling);
  const resolvedSubscriptionId =
    subscriptionId ?? user.stripeSubscriptionId ?? null;
  const planId = resolvePlanId(normalizedPlanName, user.plan?.id);

  const renewalTransaction: CreateTransactionParams = {
    stripeId: invoiceId,
    stripeInvoiceId: invoiceId,
    userId: toStringId(user._id),
    clerkId: user.clerkId,
    createdAt: now,
    expiresOn,
    amount,
    plan: normalizedPlanName,
    billing: normalizedBilling,
    type: "subscription_renewal",
  };

  const transactionClaim = await claimTransaction({
    filter: { stripeInvoiceId: invoiceId },
    transaction: renewalTransaction,
    context: `invoice.paid ${invoiceId}`,
  });

  if (transactionClaim === "error") {
    return createWebhookErrorResponse(500);
  }

  const planData: PlanData = {
    id: planId,
    name: normalizedPlanName,
    billing: normalizedBilling,
    startedOn: user.plan?.startedOn ?? now,
    expiresOn,
    amount,
    stripeId: invoiceId,
    stripeSubscriptionId: resolvedSubscriptionId ?? undefined,
    subscriptionStatus: "active",
    cancelAtPeriodEnd: user.plan?.cancelAtPeriodEnd ?? false,
    imageGenerations: 0,
    audioGenerations: 0,
    usagePeriodStart: now,
    trialUsage: user.plan?.trialUsage,
  };

  const updateConditions: Record<string, unknown>[] = [
    { "plan.stripeId": { $ne: invoiceId } },
    { "plan.expiresOn": { $ne: expiresOn } },
    { "plan.imageGenerations": { $ne: 0 } },
    { "plan.audioGenerations": { $ne: 0 } },
    { "plan.name": { $ne: normalizedPlanName } },
    { "plan.billing": { $ne: normalizedBilling } },
    { "plan.amount": { $ne: amount } },
    {
      "plan.cancelAtPeriodEnd": {
        $ne: user.plan?.cancelAtPeriodEnd ?? false,
      },
    },
    { subscriptionStatus: { $ne: "active" } },
  ];

  if (resolvedSubscriptionId) {
    updateConditions.push({
      stripeSubscriptionId: { $ne: resolvedSubscriptionId },
    });
  }

  const updateResult = await updateUserWithGuard({
    filter: {
      _id: toStringId(user._id),
      clerkId: user.clerkId,
      $or: updateConditions,
    },
    update: {
      $set: {
        updatedAt: now,
        stripeSubscriptionId: resolvedSubscriptionId ?? undefined,
        subscriptionStatus: "active",
        plan: planData,
      },
    },
    context: `invoice.paid ${invoiceId}`,
  });

  if (updateResult === "error") {
    return createWebhookErrorResponse(500);
  }

  if (updateResult === "not_matched") {
    logStripeWebhookInfo(`invoice.paid ${invoiceId}: already processed.`);
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  logStripeWebhookInfo(`invoice.paid ${invoiceId}: processed.`);
  return NextResponse.json({ message: "OK" }, { status: 200 });
}

async function handleInvoicePaymentFailed(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = invoicePaymentFailedEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError("invoice.payment_failed payload is invalid.");
    return createWebhookErrorResponse(400);
  }

  const payload: InvoicePayload = parsedEvent.data.data.object;
  const invoiceId = payload.id;
  const subscriptionId = resolveExpandableId(payload.subscription);
  const customerId = resolveExpandableId(payload.customer);
  const invoiceMetadata = resolveInvoiceSubscriptionMetadata(payload);

  await connectToDatabase();

  const user = await findWebhookUser({
    metadataUserId: invoiceMetadata?.userId,
    metadataClerkId: invoiceMetadata?.clerkId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
  });

  if (!user) {
    logStripeWebhookError(
      `invoice.payment_failed ${invoiceId} could not be matched to any user.`,
    );
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
    subscriptionStatus: "past_due",
  };

  if (subscriptionId) {
    updateFields.stripeSubscriptionId = subscriptionId;
  }

  const updateResult = await updateUserWithGuard({
    filter: {
      _id: toStringId(user._id),
      clerkId: user.clerkId,
      subscriptionStatus: { $ne: "past_due" },
    },
    update: {
      $set: updateFields,
    },
    context: `invoice.payment_failed ${invoiceId}`,
  });

  if (updateResult === "error") {
    return createWebhookErrorResponse(500);
  }

  logStripeWebhookError(
    `invoice.payment_failed ${invoiceId}: marked user ${toStringId(user._id)} as past_due.`,
  );
  return NextResponse.json({ message: "OK" }, { status: 200 });
}

async function handleCustomerSubscriptionUpdated(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = customerSubscriptionUpdatedEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError("customer.subscription.updated payload is invalid.");
    return createWebhookErrorResponse(400);
  }

  const payload: SubscriptionPayload = parsedEvent.data.data.object;
  const subscriptionId = payload.id;
  const customerId = resolveExpandableId(payload.customer);
  const metadata = payload.metadata;

  await connectToDatabase();

  const user = await findWebhookUser({
    metadataUserId: metadata?.userId,
    metadataClerkId: metadata?.clerkId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
  });

  if (!user) {
    logStripeWebhookError(
      `customer.subscription.updated ${subscriptionId} could not be matched to any user.`,
    );
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }

  const firstItemPrice = payload.items?.data[0]?.price ?? null;
  const planFromPrice = await resolveStripePlanFromPrice(
    firstItemPrice?.id ?? null,
  );
  const inferredBillingFromInterval = intervalToBillingCycle(
    firstItemPrice?.recurring?.interval,
  );
  const targetPlanName: PlanName =
    planFromPrice?.planName ?? metadata?.plan ?? user.plan?.name ?? "Lite";
  const targetBilling: BillingCycle =
    planFromPrice?.billing ??
    metadata?.billing ??
    inferredBillingFromInterval ??
    user.plan?.billing ??
    "Monthly";
  const amount =
    firstItemPrice?.unit_amount != null
      ? centsToAmount(firstItemPrice.unit_amount)
      : (user.plan?.amount ?? 0);
  const subscriptionStatus = normalizeSubscriptionStatus(payload.status);
  const cancelAtPeriodEnd = payload.cancel_at_period_end ?? false;
  const now = new Date();
  const existingPlanName = user.plan?.name ?? "Lite";
  const existingBilling = user.plan?.billing ?? "Monthly";
  const didPlanChange =
    existingPlanName !== targetPlanName || existingBilling !== targetBilling;
  const planId = resolvePlanId(
    targetPlanName,
    didPlanChange ? undefined : user.plan?.id,
  );
  const expiresOn = resolveSubscriptionPeriodEndDate(
    payload.current_period_end,
    targetPlanName,
    targetBilling,
  );

  const nextPlan: PlanData = {
    id: planId,
    name: targetPlanName,
    billing: targetBilling,
    amount,
    startedOn: didPlanChange ? now : (user.plan?.startedOn ?? now),
    expiresOn,
    stripeId: user.plan?.stripeId ?? undefined,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus,
    cancelAtPeriodEnd,
    imageGenerations: user.plan?.imageGenerations ?? 0,
    audioGenerations: user.plan?.audioGenerations ?? 0,
    usagePeriodStart: user.plan?.usagePeriodStart ?? now,
    trialUsage: user.plan?.trialUsage,
  };

  const updateConditions: Record<string, unknown>[] = [
    { stripeSubscriptionId: { $ne: subscriptionId } },
    { subscriptionStatus: { $ne: subscriptionStatus } },
    { "plan.name": { $ne: targetPlanName } },
    { "plan.billing": { $ne: targetBilling } },
    { "plan.amount": { $ne: amount } },
    { "plan.expiresOn": { $ne: expiresOn } },
    { "plan.cancelAtPeriodEnd": { $ne: cancelAtPeriodEnd } },
  ];

  const updateResult = await updateUserWithGuard({
    filter: {
      _id: toStringId(user._id),
      clerkId: user.clerkId,
      $or: updateConditions,
    },
    update: {
      $set: {
        updatedAt: now,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus,
        plan: nextPlan,
      },
    },
    context: `customer.subscription.updated ${subscriptionId}`,
  });

  if (updateResult === "error") {
    return createWebhookErrorResponse(500);
  }

  if (updateResult === "not_matched") {
    logStripeWebhookInfo(
      `customer.subscription.updated ${subscriptionId}: already processed.`,
    );
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  logStripeWebhookInfo(
    `customer.subscription.updated ${subscriptionId}: processed.`,
  );
  return NextResponse.json({ message: "OK" }, { status: 200 });
}

async function handleCustomerSubscriptionDeleted(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = customerSubscriptionDeletedEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError("customer.subscription.deleted payload is invalid.");
    return createWebhookErrorResponse(400);
  }

  const payload: SubscriptionPayload = parsedEvent.data.data.object;
  const subscriptionId = payload.id;
  const customerId = resolveExpandableId(payload.customer);
  const metadata = payload.metadata;

  await connectToDatabase();

  const user = await findWebhookUser({
    metadataUserId: metadata?.userId,
    metadataClerkId: metadata?.clerkId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
  });

  if (!user) {
    logStripeWebhookError(
      `customer.subscription.deleted ${subscriptionId} could not be matched to any user.`,
    );
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }

  const now = new Date();
  const litePlan: PlanData = {
    id: PLAN_ID_BY_NAME.Lite,
    name: "Lite",
    billing: "Monthly",
    amount: 0,
    startedOn: now,
    expiresOn: getExpiresOn("Lite", "Monthly"),
    subscriptionStatus: "canceled",
    cancelAtPeriodEnd: false,
    imageGenerations: 0,
    audioGenerations: 0,
    usagePeriodStart: now,
    trialUsage: user.plan?.trialUsage,
  };

  const updateResult = await updateUserWithGuard({
    filter: {
      _id: toStringId(user._id),
      clerkId: user.clerkId,
      $or: [
        { subscriptionStatus: { $ne: "canceled" } },
        { "plan.name": { $ne: "Lite" } },
        { stripeSubscriptionId: { $exists: true } },
        { "plan.stripeId": { $exists: true } },
      ],
    },
    update: {
      $set: {
        updatedAt: now,
        subscriptionStatus: "canceled",
        plan: litePlan,
      },
      $unset: {
        stripeSubscriptionId: "",
      },
    },
    context: `customer.subscription.deleted ${subscriptionId}`,
  });

  if (updateResult === "error") {
    return createWebhookErrorResponse(500);
  }

  if (updateResult === "not_matched") {
    logStripeWebhookInfo(
      `customer.subscription.deleted ${subscriptionId}: already processed.`,
    );
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  logStripeWebhookInfo(
    `customer.subscription.deleted ${subscriptionId}: processed.`,
  );
  return NextResponse.json({ message: "OK" }, { status: 200 });
}

async function dispatchStripeWebhookEvent({
  event,
}: {
  event: StripeWebhookEvent;
}): Promise<NextResponse> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event);
    case "invoice.paid":
      return handleInvoicePaid(event);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event);
    case "customer.subscription.updated":
      return handleCustomerSubscriptionUpdated(event);
    case "customer.subscription.deleted":
      return handleCustomerSubscriptionDeleted(event);
    default:
      logStripeWebhookInfo(`Unhandled Stripe event type: ${event.type}`);
      return NextResponse.json(
        { message: "Unhandled event", eventType: event.type },
        { status: 200 },
      );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    logStripeWebhookInfo(`Event type received: ${parsedEvent.data.type}`);
    return dispatchStripeWebhookEvent({ event: parsedEvent.data });
  } catch (error) {
    logStripeWebhookError(
      `Unhandled webhook processing error: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return createWebhookErrorResponse(500);
  }
}
