import classNames from "classnames";
import { getPlanIcon } from "@/constants/plans";
import { PlanData, PlanName } from "@/types/PlanData.d";
import Link from "next/link";
import { UserRoles } from "@/types/UserData.d";
import {
  planPromoAccentClass,
  planPromoCardClass,
} from "@/components/shared/plan-promo-styles";

interface PlanPromoProps {
  plan: PlanData;
  role: UserRoles;
}

export default function PlanPromo({ plan, role }: PlanPromoProps) {
  const isAdmin = role === "admin";
  const { name } = plan;
  const isLite = name === "Lite";
  const isPremiumFull = name === "Premium";

  return (
    <div className={classNames("PlanPromo", planPromoCardClass)}>
      <div className={planPromoAccentClass}></div>

      <div className="z-10 flex w-full flex-col gap-3 text-center">
        <div className="absolute right-0.5 top-0.5 z-10 flex items-center gap-1 font-medium">
          <span
            className={classNames(
              "rounded-sm p-1 text-2xs uppercase leading-none tracking-wider",
              "bg-twilightPurple-600 text-lavenderHaze-400",
              { "min-w-20.5": !isLite },
            )}
          >
            {isAdmin ? "Admin" : isLite ? "Free forever" : "Your plan"}
          </span>
        </div>

        <h2 className="heading-6 flex items-center justify-center gap-4 capitalize text-twilightPurple-600">
          <i
            className={classNames(getPlanIcon(name as PlanName), "text-3xl")}
            aria-hidden="true"
          ></i>
          <span>{name}</span>
        </h2>

        {isAdmin ? (
          <div className="flex w-full items-center justify-center border-t border-dotted border-twilightPurple-600 pt-2.5 text-xs font-semibold uppercase tracking-wide dark:border-dustyBlue-1000">
            Admin access - full permissions
          </div>
        ) : !isPremiumFull ? (
          <>
            <div className="flex w-full items-center justify-center border-t border-dotted border-twilightPurple-600 pt-2.5 text-xs">
              Unlock premium features with an upgrade!
            </div>
            <Link
              className="btn btn-sm btn-contained self-center"
              href="/app/plans"
            >
              Upgrade now
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
