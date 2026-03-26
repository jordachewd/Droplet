"use client";

import Link from "next/link";
import classNames from "classnames";
import { PlanName } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";
import {
  planPromoAccentClass,
  planPromoCardClass,
} from "@/components/shared/plan-promo-styles";

interface ChatSidebarPromoProps {
  isOpen: boolean;
  userRole?: UserRoles;
  planName?: PlanName | null;
}

export default function ChatSidebarPromo({
  isOpen,
  userRole,
  planName,
}: ChatSidebarPromoProps) {
  const sectionClass = classNames("ChatSidebarPromo p-3", !isOpen && "hidden");
  const promoCardClass = classNames("ChatSidebarPromoCard", planPromoCardClass);
  const promoBadgeClass = classNames(
    "rounded-sm bg-twilightPurple-600 p-1 text-2xs uppercase leading-none tracking-wider text-lavenderHaze-400",
  );

  if (userRole === "admin") {
    return (
      <section className={sectionClass}>
        <article className={promoCardClass}>
          <div className={planPromoAccentClass}></div>
          <div className="z-10 flex w-full flex-col gap-3 text-center">
            <div className="absolute right-0.5 top-0.5 z-10 flex items-center gap-1 font-medium">
              <span className={promoBadgeClass}>Admin</span>
            </div>
            <p className="mt-1 border-t border-dotted border-twilightPurple-600 pt-2.5 text-xs">
              Full permissions enabled for admin users.
            </p>
          </div>
        </article>
      </section>
    );
  }

  if (planName === "Premium") {
    return null;
  }

  const promoMessage =
    planName === "Pro"
      ? "Upgrade to Premium for highest limits and premium workflows."
      : "Upgrade to Pro for higher usage limits and more persona access.";

  return (
    <section className={sectionClass}>
      <article className={promoCardClass}>
        <div className={planPromoAccentClass}></div>
        <div className="z-10 flex w-full flex-col gap-3 text-center">
          <div className="absolute right-0.5 top-0.5 z-10 flex items-center gap-1 font-medium">
            <span className={classNames(promoBadgeClass, "min-w-20.5")}>
              Plan status
            </span>
          </div>
          <p className="mt-1 border-t border-dotted border-twilightPurple-600 pt-2.5 text-xs">
            {promoMessage}
          </p>
          <Link
            className="btn btn-sm btn-contained self-center"
            href="/app/plans"
          >
            Manage Plan
          </Link>
        </div>
      </article>
    </section>
  );
}
