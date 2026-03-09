import classNames from "classnames";
import { getPlanStatus } from "@/lib/utils/getPlanStatus";
import { Plan, PlanData, PlanStatus } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import Checkout from "@/components/shared/checkout-form";

interface PlanCardProps {
  plan: Plan;
  yearly: boolean;
  userData?: UserData | null;
  save?: number;
}

export default function PlanCard({
  plan,
  yearly,
  userData,
  save = 0,
}: PlanCardProps) {
  const hasUserData = userData && Object.keys(userData).length > 0;

  const planFee =
    plan.price === 0
      ? plan.price
      : yearly
        ? Math.round(plan.price * 12 * (1 - save))
        : plan.price;

  const planStatus = getPlanStatus({
    plan,
    planFee,
    yearly,
    userPlan: userData?.plan as PlanData,
  });

  const { isCurrent, isPopular } = planStatus as PlanStatus;
  const accentStyles = isCurrent
    ? "bg-lightAccent-500 text-darkAccent-1000 dark:bg-darkAccent-500 dark:text-darkAccent-1000"
    : isPopular
      ? "bg-darkSecondary-600 text-white"
      : "bg-lightPrimary-500/50 text-lightText-500 dark:bg-darkPrimary-500/30 dark:text-darkText-500";

  const titleStyles = isPopular
    ? "text-white"
    : isCurrent
      ? "text-darkAccent-1000"
      : "text-lightText-500 dark:text-darkText-500";

  return (
    <div
      className={classNames(
        "PlanCard relative flex w-full flex-col gap-10 overflow-hidden rounded-lg px-4 py-10 shadow-xl lg:px-8",
        accentStyles,
      )}
    >
      {(isPopular || isCurrent) && (
        <div
          className={classNames(
            "absolute -left-8 top-3.5 flex -rotate-45 bg-orange-600 p-1.5 px-8 text-[8px] font-bold uppercase leading-none tracking-widest text-white shadow-md",
            isCurrent && "bg-blue-600 dark:bg-green-700",
          )}
        >
          {isCurrent ? "Current" : "Popular"}
        </div>
      )}

      <div className="flex flex-col items-center justify-between">
        <i className={classNames(plan.icon, "text-7xl")}></i>

        <div className="flex w-full items-center justify-between">
          <h2 className={classNames("heading-4", titleStyles)}>{plan.name}</h2>

          <p
            className={classNames(
              "heading-5 flex items-center leading-none",
              titleStyles,
            )}
          >
            <span className="flex">
              {plan.price !== 0 ? "$" + planFee : "Free"}
            </span>

            {plan.price !== 0 && (
              <span className="flex self-end text-sm opacity-80">
                {yearly ? "/Yr" : "/Mo"}
              </span>
            )}
          </p>
        </div>
        <div className="flex w-full items-center justify-between pl-0.5 text-xs opacity-70">
          <span className="flex">{plan.desc}</span>
          {yearly && plan.price !== 0 && (
            <span className="flex line-through">${plan.price * 12} /Yr</span>
          )}
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5">
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
            ></i>
            <p>{incl.label}</p>
          </div>
        ))}
      </div>

      {hasUserData && (
        <div className="flex items-center justify-center">
          <Checkout
            plan={{
              id: plan.id,
              billing: yearly ? "Yearly" : "Monthly",
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
