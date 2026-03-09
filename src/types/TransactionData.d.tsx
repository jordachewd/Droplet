// ====== TRANSACTION Data Types

import { BillingCycle, CheckoutPlanParams, PlanName } from "./PlanData.d";

export interface CreateTransactionParams {
  stripeId: string;
  userId: string;
  clerkId: string;
  createdAt: Date;
  expiresOn: Date;
  plan: PlanName;
  billing: BillingCycle;
  amount: number;
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
}
