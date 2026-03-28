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

type CheckoutPlanInput = z.infer<typeof checkoutPlanSchema>;

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
      "_id firstName lastName username email",
      { lean: true },
    );
    if (!currentUser) throw new Error("User not found");

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const {
      id: planId,
      billing: planBilling,
      name: planName,
      price: planPrice,
    }: CheckoutPlanParams = (parsedTransaction.data as CheckoutPlanInput).plan;

    const { pricing } = await getEffectivePlanConfig();
    const serverPlanPrice = pricing[planName];

    if (serverPlanPrice !== planPrice) {
      throw new Error("Unable to start checkout.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Number(serverPlanPrice) * 100,
            product_data: {
              name: planName,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: currentUser.email,
      metadata: {
        userId: currentUser._id.toString(),
        clerkId: authedUserId,
        plan: planName,
        billing: planBilling,
        planId: String(planId),
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
