"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Plan } from "@/types/PlanData.d";
import { BillingCycle } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import PlanCard from "@/components/shared/PlanCard";
import LoadingBubbles from "@/components/shared/loading-bubbles";

import Link from "next/link";

import PublicSection from "@/components/public/PublicSection";
import PlansBillingToggle from "@/components/shared/PlansBillingToggle";

interface PlansProps {
  userData?: UserData | null;
  hasLoader?: boolean;
  plansData: Plan[];
  currencySymbol?: string;
  subscribeCtaLabel?: string;
  popularBadgeLabel?: string;
  yearlyDiscount?: number;
}

export default function PlansSection({
  userData,
  hasLoader = false,
  plansData,
  currencySymbol = "$",
  subscribeCtaLabel = "Subscribe Now",
  popularBadgeLabel = "Popular",
  yearlyDiscount = 30,
}: PlansProps) {
  const { isSignedIn } = useUser();
  const [billing, setBilling] = useState<BillingCycle>("Monthly");

  const hasPaidPlans = plansData.some((plan) => plan.price > 0);
  const badge = yearlyDiscount > 0 ? `-${yearlyDiscount}%` : "Yearly billing";

  if (hasLoader && !userData) return <LoadingBubbles />;

  return (
    <PublicSection
      id="plans-section"
      sectionClass="plans-section"
      wrapperClass="plans-wrapper"
    >
      {hasPaidPlans && (
        <PlansBillingToggle
          cycle={billing}
          onSelected={setBilling}
          badgeText={badge}
        />
      )}

      <div className="plans-container">
        {plansData.map((plan: Plan) => {
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              userData={userData}
              currencySymbol={currencySymbol}
              popularBadgeLabel={popularBadgeLabel}
              billingCycle={billing}
              yearlyDiscount={yearlyDiscount}
            />
          );
        })}
      </div>

      {!isSignedIn && (
        <div className="plans-bottom">
          <Link className="btn btn-md btn-hero" href="/sign-up">
            {subscribeCtaLabel}
          </Link>
        </div>
      )}
    </PublicSection>
  );
}
