"use client";
import classNames from "classnames";
import { checkoutPlan } from "@/lib/actions/transaction.action";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams, PlanStatus } from "@/types/PlanData.d";
import { useFormStatus } from "react-dom";

interface CheckoutProps {
  plan: CheckoutPlanParams;
  planStatus: PlanStatus;
}

interface CheckoutSubmitButtonProps {
  isIncluded: boolean;
  isCurrent: boolean;
  className: string;
}

function CheckoutSubmitButton({
  isIncluded,
  isCurrent,
  className,
}: CheckoutSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = isIncluded || pending;

  const buttonLabel = pending
    ? "Processing..."
    : (isCurrent && "Current") || (isIncluded && "Included") || "Subscribe";

  return (
    <button type="submit" disabled={isDisabled} className={className}>
      {buttonLabel}
    </button>
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

  const buttonVariant =
    (isPopular &&
      "btn-outlined border-white text-white hover:text-white/75 hover:border-white/75") ||
    (isIncluded && "btn-text border-transparent") ||
    "btn-outlined";

  const disabledStyle = isIncluded
    ? isCurrent
      ? "disabled:text-limeGreen-1000/50"
      : "disabled:text-limeGreen-700/50"
    : "";

  return (
    <form action={onCheckout} className="Checkout">
      <CheckoutSubmitButton
        isIncluded={isIncluded}
        isCurrent={isCurrent}
        className={classNames(
          "btn btn-md w-full min-w-48 sm:min-w-55",
          buttonVariant,
          disabledStyle,
        )}
      />
    </form>
  );
};

export default Checkout;
