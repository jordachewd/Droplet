import "server-only";

import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { getEffectiveStripeBillingConfig } from "@/lib/utils/effective-stripe-billing-config";
import {
  BillingCycle,
  PlanData,
  PlanName,
  SubscriptionStatus,
} from "@/types/PlanData.d";
import { CreateTransactionParams } from "@/types/TransactionData.d";
import { NextResponse } from "next/server";
import {
  CheckoutSessionPayload,
  InvoicePayload,
  StripeWebhookEvent,
  SubscriptionPayload,
  WebhookUserRecord,
  calculateExpiresOn,
  centsToAmount,
  checkoutSessionCompletedEventSchema,
  claimTransaction,
  createWebhookErrorResponse,
  customerSubscriptionDeletedEventSchema,
  customerSubscriptionUpdatedEventSchema,
  findWebhookUser,
  getLitePlanDefaults,
  intervalToBillingCycle,
  invoicePaidEventSchema,
  invoicePaymentFailedEventSchema,
  logStripeWebhookError,
  logStripeWebhookInfo,
  normalizeSubscriptionStatus,
  pickInvoiceLinePrice,
  resolveExpandableId,
  resolveInvoiceSubscriptionMetadata,
  resolvePlanAndBillingFromPriceId,
  resolvePlanId,
  resolveSubscriptionPeriodEndDate,
  toStringId,
  updateUserWithGuard,
} from "./stripe-webhook-shared";

async function handleCheckoutSessionCompleted(
  event: StripeWebhookEvent,
): Promise<NextResponse> {
  const parsedEvent = checkoutSessionCompletedEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logStripeWebhookError(
      `Checkout session metadata is invalid. Zod errors: ${JSON.stringify(parsedEvent.error.issues)}`,
    );
    return createWebhookErrorResponse(400);
  }

  const parsedSession: CheckoutSessionPayload = parsedEvent.data.data.object;
  const subscriptionId = resolveExpandableId(parsedSession.subscription);
  const checkoutInvoiceId = resolveExpandableId(parsedSession.invoice);

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

  logStripeWebhookInfo(
    `Checkout session ${checkoutSessionId}: looking up user _id=${metadataUserId} clerkId=${metadataClerkId} plan=${metadataPlanName} billing=${metadataBilling}`,
  );

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
  const expiresOn = calculateExpiresOn(metadataPlanName, metadataBilling);
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
    stripeInvoiceId: checkoutInvoiceId ?? undefined,
    userId: toStringId(existingUser._id),
    clerkId: metadataClerkId,
    createdAt: now,
    expiresOn,
    amount,
    plan: metadataPlanName,
    billing: metadataBilling,
    type: "subscription_initial",
  };

  const transactionClaimFilter: Record<string, unknown> = checkoutInvoiceId
    ? {
        $or: [
          { stripeId: checkoutSessionId },
          { stripeInvoiceId: checkoutInvoiceId },
        ],
      }
    : { stripeId: checkoutSessionId };

  const transactionClaim = await claimTransaction({
    filter: transactionClaimFilter,
    transaction,
    context: `checkout.session.completed ${checkoutSessionId}`,
  });

  logStripeWebhookInfo(
    `Checkout session ${checkoutSessionId}: transaction claim result=${transactionClaim}`,
  );

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
          subscriptionStatus: "active" as SubscriptionStatus,
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
        subscriptionStatus: "active" as SubscriptionStatus,
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
    logStripeWebhookError(
      `invoice.paid payload is invalid. Zod errors: ${JSON.stringify(parsedEvent.error.issues)}`,
    );
    return createWebhookErrorResponse(400);
  }

  const payload: InvoicePayload = parsedEvent.data.data.object;
  const invoiceId = payload.id;
  const subscriptionId = resolveExpandableId(payload.subscription);
  const customerId = resolveExpandableId(payload.customer);
  const invoiceMetadata = resolveInvoiceSubscriptionMetadata(payload);

  logStripeWebhookInfo(
    `invoice.paid ${invoiceId}: subscriptionId=${subscriptionId ?? "null"} customerId=${customerId ?? "null"} hasMetadata=${Boolean(invoiceMetadata)}`,
  );

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
  const expiresOn = calculateExpiresOn(normalizedPlanName, normalizedBilling);
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
        subscriptionStatus: "active" as SubscriptionStatus,
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
  const litePlan = getLitePlanDefaults({
    now,
    trialUsage: user.plan?.trialUsage,
  });

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

export async function dispatchStripeWebhookEvent({
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
