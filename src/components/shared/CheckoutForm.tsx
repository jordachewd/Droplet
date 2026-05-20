"use client";

import { checkoutPlan } from "@/lib/actions/transaction.action";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams, PlanStatus } from "@/types/PlanData.d";
import { useFormStatus } from "react-dom";
import Button from "@/components/shared/button";

interface CheckoutProps {
  plan: CheckoutPlanParams;
  planStatus: PlanStatus;
  className?: string;
}

interface CheckoutSubmitButtonProps {
  isIncluded: boolean;
  isCurrent: boolean;
  variant: "text" | "contained" | "outlined" | "hero";
}

function CheckoutSubmitButton({
  isIncluded,
  isCurrent,
  variant,
}: CheckoutSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = isIncluded || pending;

  const buttonLabel = pending
    ? "Processing..."
    : (isCurrent && "Current Plan") ||
      (isIncluded && "Included") ||
      "Subscribe";

  return (
    <Button type="submit" size="md" variant={variant} disabled={isDisabled}>
      {buttonLabel}
    </Button>
  );
}

const CheckoutForm = ({ plan, planStatus, className }: CheckoutProps) => {
  const { isIncluded, isPopular, isCurrent } = planStatus as PlanStatus;

  const onCheckout = async () => {
    const transaction: CheckoutTransactionParams = {
      plan,
    };

    await checkoutPlan(transaction);
  };

  const variant: "hero" | "text" | "contained" = isIncluded ? "text" : !isPopular ? "contained" : "hero";

  return (
    <form action={onCheckout} className={className}>
      <CheckoutSubmitButton
        isIncluded={isIncluded}
        isCurrent={isCurrent}
        variant={variant}
      />
    </form>
  );
};

export default CheckoutForm;
