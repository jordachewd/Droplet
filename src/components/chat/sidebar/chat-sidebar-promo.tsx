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
  if (planName === "Premium" && userRole !== "admin" && !isSuspended) {
    return null;
  }

  let title: string;
  let description: string;
  let showUpgradeLink = false;

  if (userRole === "admin") {
    title = promoContent.promoAdminLabel;
    description = promoContent.promoAdminDescription;
  } else if (isSuspended) {
    title = promoContent.promoSuspensionTitle;
    description = promoContent.promoSuspensionDescription;
  } else {
    title =
      planName === "Pro"
        ? promoContent.promoTitlePremium
        : promoContent.promoTitlePro;
    description =
      planName === "Pro"
        ? promoContent.promoDescriptionPremium
        : promoContent.promoDescriptionPro;
    showUpgradeLink = true;
  }

  const sectionClass = classNames("ChatSidebarPromo p-3", !isOpen && "hidden");
  const promoCardClass = classNames("ChatSidebarPromoCard", planPromoCardClass);

  return (
    <div className={sectionClass}>
      <div className={promoCardClass}>
        <div className={planPromoAccentClass}></div>
        <div className="z-10 flex w-full flex-col gap-2 text-center">
          <h6 className="heading-6 text-lavenderHaze-300">{title}</h6>
          <p className="text-xs leading-4">{description}</p>

          {showUpgradeLink && (
            <Link
              className="btn btn-sm btn-contained self-center mt-2"
              href="/app/plans"
            >
              {promoContent.promoUpgradeCta}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
