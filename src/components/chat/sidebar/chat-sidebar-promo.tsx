"use client";

import Link from "next/link";
import classNames from "classnames";
import { DEFAULT_PROMO_CONTENT, PromoContent } from "@/constants/promo-content";
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
  promoContent?: PromoContent;
}

export default function ChatSidebarPromo({
  isOpen,
  userRole,
  planName,
  isSuspended,
  promoContent = DEFAULT_PROMO_CONTENT,
}: ChatSidebarPromoProps) {
  const sectionClass = classNames("ChatSidebarPromo p-3", !isOpen && "hidden");
  const promoCardClass = classNames("ChatSidebarPromoCard", planPromoCardClass);

  if (userRole === "admin") {
    return (
      <section className={sectionClass}>
        <article className={promoCardClass}>
          <div className={planPromoAccentClass}></div>
          <div className="z-10 flex w-full flex-col gap-2 text-center">
            <h6 className="heading-6 text-twilightPurple-600">
              {promoContent.promoAdminLabel}
            </h6>
            <p className="text-xs leading-4">
              {promoContent.promoAdminDescription}
            </p>
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
            <h6 className="heading-6 text-twilightPurple-600">
              {promoContent.promoSuspensionTitle}
            </h6>
            <p className="text-xs leading-4">
              {promoContent.promoSuspensionDescription}
            </p>
          </div>
        </article>
      </section>
    );
  }

  if (planName === "Premium") {
    return null;
  }

  const promoTitle =
    planName === "Pro"
      ? promoContent.promoTitlePremium
      : promoContent.promoTitlePro;

  const promoMessage =
    planName === "Pro"
      ? promoContent.promoDescriptionPremium
      : promoContent.promoDescriptionPro;

  return (
    <section className={sectionClass}>
      <article className={promoCardClass}>
        <div className={planPromoAccentClass}></div>
        <div className="z-10 flex w-full flex-col gap-2 text-center">
          <h6 className="heading-6 font-semibold text-twilightPurple-600">
            {promoTitle}
          </h6>
          <p className="text-xs leading-4">{promoMessage}</p>

          <Link
            className="btn btn-sm btn-contained self-center mt-2"
            href="/app/plans"
          >
            {promoContent.promoUpgradeCta}
          </Link>
        </div>
      </article>
    </section>
  );
}
