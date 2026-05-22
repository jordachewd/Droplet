import classNames from "classnames";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import { BillingCycle, Plan, PlanData, PlanStatus } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import CheckoutForm from "@/components/shared/CheckoutForm";
import { resolveBillingPrice } from "@/lib/utils/resolve-billing-price";

interface PlanCardProps {
  plan: Plan;
  userData?: UserData | null;
  currencySymbol?: string;
  popularBadgeLabel?: string;
  billingCycle?: BillingCycle;
  yearlyDiscount?: number;
}

export default function PlanCard({
  plan,
  userData,
  currencySymbol = "$",
  popularBadgeLabel = "Popular",
  billingCycle = "Monthly",
  yearlyDiscount = 0,
}: PlanCardProps) {
  const hasUserData = userData && Object.keys(userData).length > 0;
  const moPricing = plan.price;

  const billingPrice = resolveBillingPrice({
    monthlyPrice: moPricing,
    billingCycle,
    yearlyDiscount,
  });

  const isYearly = billingCycle === "Yearly";
  const savings = Number((moPricing * 12 - billingPrice).toFixed(2));

  const displayPriceLabel = isYearly
    ? billingPrice.toFixed(2)
    : String(billingPrice);

  const planStatus = getPlanStatus({
    plan,
    planFee: moPricing,
    userPlan: userData?.plan as PlanData,
  });

  const { isCurrent, isPopular } = planStatus as PlanStatus;

  const cardClass = classNames("PlanCard", "plan-card", {
    "bg-dustyBlue-200 text-midnightBlue-500/50": isCurrent,
    "bg-twilightPurple-500 text-white": isPopular,
  });

  const badgeClass = classNames("plan-card-badge", {
    "bg-dustyBlue-500 text-white": isCurrent,
    "bg-limeGreen-500 text-midnightBlue-800": isPopular,
  });

  const titleClass = isPopular
    ? "text-white"
    : isCurrent
      ? "text-midnightBlue-500/50"
      : "text-twilightPurple-500";

  const iconClass = classNames("plan-card-top--icon", plan.icon);

  const savingsClass = classNames("plan-card-top--save", {
    "text-limeGreen-500": isPopular,
    "text-orange-600": !isPopular,
  });

  const checkoutPlan = {
    id: plan.id,
    billing: billingCycle,
    name: plan.name,
    price: billingPrice,
  };

  return (
    <div className={cardClass}>
      {(isPopular || isCurrent) && (
        <div className={badgeClass}>
          {isCurrent ? "Current" : popularBadgeLabel}
        </div>
      )}

      <div className="plan-card-top">
        <i className={iconClass} aria-hidden="true"></i>

        <div className="plan-card-top--row items-center">
          <h2 className={classNames("heading-3", titleClass)}>{plan.name}</h2>

          <div
            className={classNames(
              "heading-3 flex items-center leading-none",
              titleClass,
            )}
          >
            <span className="flex">
              {plan.price !== 0 ? currencySymbol + displayPriceLabel : "Free"}
            </span>

            {plan.price !== 0 && (
              <span className="flex self-end text-sm opacity-50">
                {isYearly ? "/Yr" : "/Mo"}
              </span>
            )}
          </div>
        </div>

        <div className="plan-card-top--row">
          <span className="plan-card-top--desc">{plan.desc}</span>

          {plan.price !== 0 && isYearly && (
            <span className={savingsClass}>
              Save {savings > 0 ? `${currencySymbol}${savings.toFixed(2)}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="plan-card-list">
        {plan.inclusions.map((incl, index) => {
          const inclIconClass = classNames(
            "bi",
            incl.isIncluded ? "bi-check2" : "bi-x",
          );

          return (
            <div key={incl.label + index} className="plan-card-list--item">
              <i className={inclIconClass} aria-hidden="true"></i>
              <p>{incl.label}</p>
            </div>
          );
        })}
      </div>

      {hasUserData && (
        <CheckoutForm
          plan={checkoutPlan}
          planStatus={planStatus}
          className="plan-card-checkout"
        />
      )}
    </div>
  );
}
