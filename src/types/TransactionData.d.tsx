// ====== TRANSACTION Data Types

import { BillingCycle, CheckoutPlanParams, PlanName } from "./PlanData.d";

export type TransactionType =
  | "one_time"
  | "subscription_initial"
  | "subscription_renewal";

export interface CreateTransactionParams {
  stripeId: string;
  userId: string;
  clerkId: string;
  createdAt: Date;
  expiresOn: Date;
  plan: PlanName;
  billing: BillingCycle;
  amount: number;
  type?: TransactionType;
  stripeInvoiceId?: string;
}

export interface CheckoutTransactionParams {
  plan: CheckoutPlanParams;
}

export interface Transaction {
  id: string;
  plan: string;
  amount: number;
  createdAt: Date;
  expiresOn: Date;
  billing: BillingCycle;
  stripeId: string;
  type?: TransactionType;
  stripeInvoiceId?: string;
}
