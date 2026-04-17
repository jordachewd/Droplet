"use client";

import { checkoutPlan } from "@/lib/actions/transaction.action";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams, PlanStatus } from "@/types/PlanData.d";
import { useFormStatus } from "react-dom";
import Button from "@/components/shared/button";

interface CheckoutProps {
  plan: CheckoutPlanParams;
  planStatus: PlanStatus;
}

interface CheckoutSubmitButtonProps {
  isIncluded: boolean;
  isCurrent: boolean;
  variant: "text" | "contained" | "outlined" | "hero";
  className: string;
}

function CheckoutSubmitButton({
  isIncluded,
  isCurrent,
  variant,
  className,
}: CheckoutSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = isIncluded || pending;

  const buttonLabel = pending
    ? "Processing..."
    : (isCurrent && "Current Plan") || (isIncluded && "Included") || "Subscribe";

  return (
    <Button
      type="submit"
      variant={variant}
      size="md"
      disabled={isDisabled}
      className={className}
    >
      {buttonLabel}
    </Button>
  );
}

const Checkout = ({ plan, planStatus }: CheckoutProps) => {
  const { isIncluded, isCurrent } = planStatus as PlanStatus;

  const onCheckout = async () => {
    const transaction: CheckoutTransactionParams = {
      plan,
    };

    await checkoutPlan(transaction);
  };

  const variant: "hero" | "text" = isIncluded ? "text" : "hero";

  return (
    <form action={onCheckout} className="Checkout">
      <CheckoutSubmitButton
        isIncluded={isIncluded}
        isCurrent={isCurrent}
        variant={variant}
        className="w-full min-w-48 sm:min-w-55"
      />
    </form>
  );
};

export default Checkout;
