import "server-only";
import { BillingCycle, PlanName } from "@/types/PlanData.d";
import { TransactionType } from "@/types/TransactionData.d";
import { Schema, model, models, ObjectId, Document } from "mongoose";

interface ITransaction extends Document {
  stripeId: string;
  stripeInvoiceId?: string;
  userId: ObjectId | string;
  clerkId: string;
  createdAt: Date;
  expiresOn: Date;
  amount: number;
  plan: PlanName;
  billing: BillingCycle;
  type: TransactionType;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stripeId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeInvoiceId: {
      type: String,
      unique: true,
      sparse: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresOn: {
      type: Date,
      default: Date.now,
      required: true,
    },
    plan: {
      type: String,
      enum: ["Lite", "Pro", "Premium"],
      required: true,
      default: "Lite",
    },
    billing: {
      type: String,
      enum: ["Monthly", "Yearly"],
      required: true,
      default: "Monthly",
    },
    type: {
      type: String,
      enum: ["one_time", "subscription_initial", "subscription_renewal"],
      required: true,
      default: "one_time",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { strict: true },
);

const Transaction =
  models?.Transaction || model("Transaction", TransactionSchema);

export default Transaction;
