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
  isSuspended?: boolean;
}

export default function ChatSidebarPromo({
  isOpen,
  userRole,
  planName,
  isSuspended,
}: ChatSidebarPromoProps) {
  const sectionClass = classNames("ChatSidebarPromo p-3", !isOpen && "hidden");
  const promoCardClass = classNames("ChatSidebarPromoCard", planPromoCardClass);

  if (userRole === "admin") {
    return (
      <section className={sectionClass}>
        <article className={promoCardClass}>
          <div className={planPromoAccentClass}></div>
          <div className="z-10 flex w-full flex-col gap-2 text-center">
            <h6 className="heading-6 text-twilightPurple-600">Admin</h6>
            <p className="text-xs leading-4">You have admin access.</p>
          </div>
        </article>
      </section>
    );
  }

  if (isSuspended) {
    return (
      <section className={sectionClass}>
        <article className={promoCardClass}>
          <div className={planPromoAccentClass}></div>
          <div className="z-10 flex w-full flex-col gap-2 text-center">
            <h6 className="heading-6 text-twilightPurple-600">Account Suspended</h6>
            <p className="text-xs leading-4">
              Your account has been suspended. Contact support for assistance.
            </p>
          </div>
        </article>
      </section>
    );
  }

  if (planName === "Premium") {
    return null;
  }

  const promoTitle = planName === "Pro" ? "Go Premium" : "Go Pro";

  const promoMessage =
    planName === "Pro"
      ? "Upgrade to Premium for highest limits and premium workflows."
      : "Upgrade to Pro for higher usage limits and more persona access.";

  return (
    <section className={sectionClass}>
      <article className={promoCardClass}>
        <div className={planPromoAccentClass}></div>
        <div className="z-10 flex w-full flex-col gap-2 text-center">
          <h6 className="heading-6 font-semibold text-twilightPurple-600">{promoTitle}</h6>
          <p className="text-xs leading-4">{promoMessage}</p>

          <Link
            className="btn btn-sm btn-contained self-center mt-2"
            href="/app/plans"
          >
            Upgrade Now
          </Link>
        </div>
      </article>
    </section>
  );
}
