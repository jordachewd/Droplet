import "server-only";

import { getExpiresOn } from "@/constants/plans";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import type { StripePriceIds } from "@/lib/utils/effective-stripe-billing-config";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import {
  BillingCycle,
  PlanData,
  PlanName,
  SubscriptionStatus,
} from "@/types/PlanData.d";
import { CreateTransactionParams } from "@/types/TransactionData.d";
import { NextResponse } from "next/server";
import { z } from "zod";

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

export const stripeWebhookEventSchema = z
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
    invoice: expandableIdSchema.optional(),
    metadata: checkoutSessionMetadataSchema,
  })
  .passthrough();

export const checkoutSessionCompletedEventSchema = z
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

export const invoicePaidEventSchema = z
  .object({
    type: z.literal("invoice.paid"),
    data: z
      .object({
        object: invoicePayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

export const invoicePaymentFailedEventSchema = z
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

export const customerSubscriptionUpdatedEventSchema = z
  .object({
    type: z.literal("customer.subscription.updated"),
    data: z
      .object({
        object: subscriptionPayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

export const customerSubscriptionDeletedEventSchema = z
  .object({
    type: z.literal("customer.subscription.deleted"),
    data: z
      .object({
        object: subscriptionPayloadSchema,
      })
      .passthrough(),
  })
  .passthrough();

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;
export type CheckoutSessionPayload = z.infer<
  typeof checkoutSessionPayloadSchema
>;
export type InvoicePayload = z.infer<typeof invoicePayloadSchema>;
export type SubscriptionPayload = z.infer<typeof subscriptionPayloadSchema>;
export type StripePricePayload = z.infer<typeof stripePricePayloadSchema>;

export interface WebhookPlanUsageRecord {
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

export interface WebhookUserRecord {
  _id: string | { toString(): string };
  clerkId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  plan?: WebhookUserPlanRecord | null;
}

export type TransactionClaimStatus = "created" | "existing" | "error";
export type UserUpdateStatus = "updated" | "not_matched" | "error";

export function logStripeWebhookError(message: string): void {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

export function logStripeWebhookInfo(message: string): void {
  process.stderr.write(`[stripe-webhook] ${message}\n`);
}

export function createWebhookErrorResponse(status: 400 | 500): NextResponse {
  return NextResponse.json(
    {
      message: "Webhook error",
      error: WEBHOOK_FAILURE_MESSAGE,
    },
    { status },
  );
}

export function toStringId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

export function resolveExpandableId(
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

export function centsToAmount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value / 100;
}

export function intervalToBillingCycle(
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

export function normalizeSubscriptionStatus(
  status: string,
): SubscriptionStatus {
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

export function resolvePlanAndBillingFromPriceId({
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

export function pickInvoiceLinePrice(
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

export function resolveInvoiceSubscriptionMetadata(
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

export function resolvePlanId(
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

export function calculateExpiresOn(
  planName: PlanName,
  billing: BillingCycle,
): Date {
  return getExpiresOn(planName, billing);
}

export function resolveSubscriptionPeriodEndDate(
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
    return calculateExpiresOn(fallbackPlanName, fallbackBilling);
  }

  return new Date();
}

export function getLitePlanDefaults({
  now,
  trialUsage,
}: {
  now: Date;
  trialUsage: WebhookPlanUsageRecord | undefined;
}): PlanData {
  return {
    id: PLAN_ID_BY_NAME.Lite,
    name: "Lite",
    billing: "Monthly",
    amount: 0,
    startedOn: now,
    expiresOn: calculateExpiresOn("Lite", "Monthly"),
    subscriptionStatus: "canceled",
    cancelAtPeriodEnd: false,
    imageGenerations: 0,
    audioGenerations: 0,
    usagePeriodStart: now,
    trialUsage,
  };
}

export async function findWebhookUser({
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

export async function claimTransaction({
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

export async function updateUserWithGuard({
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
