import { BillingCycle } from "@/types/PlanData";

type BillingPriceOptions = {
  monthlyPrice: number;
  billingCycle: BillingCycle;
  yearlyDiscount: number;
};

export function resolveBillingPrice({
  monthlyPrice,
  billingCycle,
  yearlyDiscount,
}: BillingPriceOptions): number {
    
  if (billingCycle === "Monthly") {
    return monthlyPrice;
  }

  const yearlyMultiplier = (100 - yearlyDiscount) / 100;
  return Number((monthlyPrice * 12 * yearlyMultiplier).toFixed(2));
}
