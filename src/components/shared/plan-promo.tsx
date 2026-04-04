import classNames from "classnames";
import { getPlanIcon } from "@/constants/plans";
import { DEFAULT_PROMO_CONTENT, PromoContent } from "@/constants/promo-content";
import { ADMIN_PLAN_LABEL } from "@/lib/utils/plan-display";
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
  isSuspended?: boolean;
  supportEmail?: string;
  promoContent?: PromoContent;
}

export default function PlanPromo({
  plan,
  role,
  isSuspended = false,
  supportEmail,
  promoContent = DEFAULT_PROMO_CONTENT,
}: PlanPromoProps) {
  const isAdmin = role === "admin";
  const { name } = plan;
  const isLite = name === "Lite";
  const isPremiumFull = name === "Premium";
  const supportHref = supportEmail ? `mailto:${supportEmail}` : "/privacy";

  return (
    <div className={classNames("PlanPromo", planPromoCardClass)}>
      <div className={planPromoAccentClass}></div>

      <div className="z-10 flex w-full flex-col gap-4 text-center">
        {!isAdmin && (
          <div className="absolute right-0.5 top-0.5 z-10 flex items-center gap-1 font-medium">
            <span
              className={classNames(
                "rounded-sm p-1 text-2xs uppercase leading-none tracking-wider",
                "bg-dustyBlue-500 text-midnightBlue-900",
                { "min-w-20.5": !isLite },
              )}
            >
              {isLite
                ? promoContent.promoFreeLabel
                : promoContent.promoCurrentPlanLabel}
            </span>
          </div>
        )}

        <h2 className="heading-6 flex items-center gap-2 capitalize text-lavenderHaze-300">
          {!isAdmin && (
            <i
              className={classNames(getPlanIcon(name as PlanName), "text-2xl")}
              aria-hidden="true"
            ></i>
          )}

          <span>{isAdmin ? ADMIN_PLAN_LABEL : name}</span>
        </h2>

        {isAdmin ? (
          <div className="flex w-full text-xs">
            {promoContent.promoAdminDescription}
          </div>
        ) : isSuspended ? (
          <>
            <div className="flex w-full items-center justify-center pt-2.5 text-xs font-semibold uppercase tracking-wide">
              {promoContent.promoSuspensionTitle}
            </div>
            <p className="text-xs opacity-80">
              {promoContent.promoSuspensionDescription}
            </p>
            <a
              className="btn btn-sm btn-contained self-center"
              href={supportHref}
            >
              {promoContent.promoContactSupportCta}
            </a>
          </>
        ) : !isPremiumFull ? (
          <>
            <div className="flex w-full items-center text-xs">
              {promoContent.promoUpgradeMessage}
            </div>
            <Link
              className="btn btn-sm btn-contained self-center"
              href="/app/plans"
            >
              {promoContent.promoUpgradeCta}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
