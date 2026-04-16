"use client";

import classNames from "classnames";
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
  variant: "outlined" | "text";
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
    : (isCurrent && "Current") || (isIncluded && "Included") || "Subscribe";

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
  const { isIncluded, isCurrent, isPopular } = planStatus as PlanStatus;

  const onCheckout = async () => {
    const transaction: CheckoutTransactionParams = {
      plan,
    };

    await checkoutPlan(transaction);
  };

  const variant: "outlined" | "text" = isIncluded ? "text" : "outlined";

  const extraStyles =
    (isPopular &&
      "border-white text-white hover:text-white/75 hover:border-white/75") ||
    (isIncluded && "border-transparent") ||
    "dark:border-midnightBlue-500 dark:text-midnightBlue-500 dark:hover:border-dustyBlue-500 dark:hover:text-dustyBlue-500";

  const disabledStyle = isIncluded
    ? isCurrent
      ? "disabled:text-midnightBlue-1000/50 hidden"
      : "disabled:text-midnightBlue-700/50"
    : "";

  return (
    <form action={onCheckout} className="Checkout">
      <CheckoutSubmitButton
        isIncluded={isIncluded}
        isCurrent={isCurrent}
        variant={variant}
        className={classNames(
          "w-full min-w-48 sm:min-w-55",
          extraStyles,
          disabledStyle,
        )}
      />
    </form>
  );
};

export default Checkout;
