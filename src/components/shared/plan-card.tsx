import classNames from "classnames";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import { Plan, PlanData, PlanStatus } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import Checkout from "@/components/shared/checkout-form";

interface PlanCardProps {
  plan: Plan;
  userData?: UserData | null;
  currencySymbol?: string;
  popularBadgeLabel?: string;
}

export default function PlanCard({
  plan,
  userData,
  currencySymbol = "$",
  popularBadgeLabel = "Popular",
}: PlanCardProps) {
  const hasUserData = userData && Object.keys(userData).length > 0;
  const planFee = plan.price;

  const planStatus = getPlanStatus({
    plan,
    planFee,
    userPlan: userData?.plan as PlanData,
  });

  const { isCurrent, isPopular } = planStatus as PlanStatus;

  const accentStyles = isCurrent
    ? "bg-dustyBlue-200 text-midnightBlue-500/50"
    : isPopular
      ? "bg-twilightPurple-500 text-white"
      : "bg-lavenderHaze-500 text-twilightPurple-500";

  const titleStyles = isPopular
    ? "text-white"
    : isCurrent
      ? "text-midnightBlue-500/50"
      : "text-twilightPurple-500";

  const cardStyles = classNames(
    "PlanCard relative flex w-full flex-col gap-10 overflow-hidden rounded-lg px-10 py-14 shadow-xl align-top",
    accentStyles,
  );

  const badgeStyles = classNames(
    "PlanCardBadge absolute -left-8 top-3.5 flex -rotate-45 p-1.5 text-2xs",
    "uppercase leading-none tracking-widest shadow-sm px-8 font-semibold",
    isCurrent && "bg-dustyBlue-500 text-midnightBlue-900 text-white",
    isPopular && "bg-limeGreen-500 text-midnightBlue-600 font-bold",
  );

  const planIconStyles = classNames(plan.icon, "text-7xl pb-12");

  return (
    <div className={cardStyles}>
      {(isPopular || isCurrent) && (
        <div className={badgeStyles}>
          {isCurrent ? "Current" : popularBadgeLabel}
        </div>
      )}

      <div className="PlanCardHead flex flex-col items-center justify-between">
        <i className={planIconStyles} aria-hidden="true"></i>

        <div className="flex w-full items-center justify-between">
          <h2 className={classNames("heading-4", titleStyles)}>{plan.name}</h2>

          <p
            className={classNames(
              "heading-5 flex items-center leading-none",
              titleStyles,
            )}
          >
            <span className="flex">
              {plan.price !== 0 ? currencySymbol + planFee : "Free"}
            </span>

            {plan.price !== 0 && (
              <span className="flex self-end text-sm opacity-70">/Mo</span>
            )}
          </p>
        </div>
        <div className="flex w-full items-center justify-between pl-0.5 text-xs opacity-70">
          <span className="flex">{plan.desc}</span>
        </div>
      </div>

      <div className="PlanCardList flex w-full flex-col gap-3">
        {plan.inclusions.map((incl) => (
          <div
            key={plan.name + incl.label}
            className="flex items-center gap-4 text-xs"
          >
            <i
              className={classNames(
                "bi",
                incl.isIncluded ? "bi-check2" : "bi-x",
              )}
              aria-hidden="true"
            ></i>
            <p>{incl.label}</p>
          </div>
        ))}
      </div>

      {hasUserData && (
        <div className="PlanCardFooter flex items-center justify-center mt-auto">
          <Checkout
            plan={{
              id: plan.id,
              billing: "Monthly",
              name: plan.name,
              price: planFee,
            }}
            planStatus={planStatus}
          />
        </div>
      )}
    </div>
  );
}
