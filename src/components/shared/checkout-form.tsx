"use client";
import classNames from "classnames";
import { checkoutPlan } from "@/lib/actions/transaction.action";
import { CheckoutTransactionParams } from "@/types/TransactionData.d";
import { CheckoutPlanParams, PlanStatus } from "@/types/PlanData.d";

interface CheckoutProps {
  plan: CheckoutPlanParams;
  planStatus: PlanStatus;
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
      ? "disabled:text-twilightPurple-1000/50 dark:disabled:text-dustyBlue-1000/50"
      : "disabled:text-twilightPurple-700/50 dark:disabled:text-dustyBlue-500/50"
    : "";

  return (
    <form action={onCheckout} className="Checkout">
      <button
        type="submit"
        disabled={isIncluded}
        className={classNames(
          "btn btn-md w-full min-w-48 sm:min-w-55",
          buttonVariant,
          disabledStyle,
        )}
      >
        {(isCurrent && "Current") || (isIncluded && "Included") || "Subscribe"}
      </button>
    </form>
  );
};

export default Checkout;
