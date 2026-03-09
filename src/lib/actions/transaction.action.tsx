"use server";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { handleError } from "@/lib/utils/handleError";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import User from "@/lib/database/models/user.model";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams } from "@/types/PlanData.d";
import getFullName from "@/lib/utils/getFullName";
import serializeForClient from "@/lib/utils/serialize-for-client";
import { auth } from "@clerk/nextjs/server";

export async function checkoutPlan(transaction: CheckoutTransactionParams) {
  const { userId: authedUserId } = await auth();
  if (!authedUserId) throw new Error("Unauthorized");

  await connectToDatabase();

  const currentUser = await User.findOne({ clerkId: authedUserId });
  if (!currentUser) throw new Error("User not found");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const {
    id: planId,
    billing: planBilling,
    name: planName,
    price: planPrice,
  }: CheckoutPlanParams = transaction.plan;

  const fullName = getFullName({
    firstName: currentUser.firstName || "",
    lastName: currentUser.lastName || "",
    username: currentUser.username || "",
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Number(planPrice) * 100,
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
      name: fullName,
      plan: planName,
      billing: planBilling,
      planId: String(planId),
    },
    success_url: `${BASEURL}/profile`,
    cancel_url: `${BASEURL}/plans`,
  });

  redirect(session.url!);
}

export async function getAllTransactions(userId: string) {
  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");

    await connectToDatabase();

    const transactions = await Transaction.find({ clerkId: userId }, null, {
      sort: {
        createdAt: -1, //Sort by Date Added DESC
      },
    }).exec();

    return serializeForClient(transactions);
  } catch (error) {
    handleError({ error, source: "getAllTransactions" });
  }
}

export async function deleteAllTransactions(userId: string) {
  try {
    const { userId: authedUserId } = await auth();
    if (!authedUserId) throw new Error("Unauthorized");
    if (authedUserId !== userId) throw new Error("Forbidden");

    await connectToDatabase();

    await Transaction.deleteMany({ clerkId: userId });

    return { message: "All transactions deleted successfully" };
  } catch (error) {
    handleError({ error, source: "deleteAllTransactions" });
  }
}
