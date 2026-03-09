// ====== PLAN Data Types

interface Inclusion {
  label: string;
  isIncluded: boolean;
}

export type PlanName = "Lite" | "Pro" | "Premium";
export type BillingCycle = "Monthly" | "Yearly";

export interface Plan {
  id: number;
  name: PlanName;
  desc: string;
  icon: string;
  price: number;
  inclusions: Inclusion[];
}

export interface PlanData {
  id: string;
  name: PlanName;
  amount: number;
  billing: BillingCycle;
  expiresOn: Date;
  startedOn: Date;
  stripeId?: string;
}

export interface PlanStatus {
  isIncluded: boolean;
  isCurrent: boolean;
  isPopular: boolean;
}

export interface CheckoutPlanParams {
  id: number;
  billing: BillingCycle;
  name: PlanName;
  price: number;
}
