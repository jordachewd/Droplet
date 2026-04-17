"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Plan } from "@/types/PlanData.d";
import { BillingCycle } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import PlanCard from "@/components/shared/plan-card";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import Button from "@/components/shared/button";
import Link from "next/link";
import classNames from "classnames";

interface PlansProps {
  userData?: UserData | null;
  hasLoader?: boolean;
  plansData: Plan[];
  currencySymbol?: string;
  subscribeCtaLabel?: string;
  popularBadgeLabel?: string;
  yearlyDiscount?: number;
  className?: string;
}

export default function Plans({
  userData,
  hasLoader = false,
  plansData,
  currencySymbol = "$",
  subscribeCtaLabel = "Subscribe Now",
  popularBadgeLabel = "Popular",
  yearlyDiscount = 30,
  className = "",
}: PlansProps) {
  const { isSignedIn } = useUser();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");

  if (hasLoader && !userData)
    return (
      <div className="Plans flex h-96 w-full items-center justify-center">
        <LoadingBubbles />
      </div>
    );

  const wrapperClassName = classNames(
    "Plans mx-auto flex w-full flex-col gap-20 px-4 max-w-screen-2xl",
    className,
  );
  const hasPaidPlans = plansData.some((plan) => plan.price > 0);
  const yearlyBadgeText =
    yearlyDiscount > 0 ? `Save ${yearlyDiscount}% yearly` : "Yearly billing";

  return (
    <section className={wrapperClassName}>
      {hasPaidPlans && (
        <div className="PlansBillingToggle mx-auto flex w-full justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-400 bg-lavenderHaze-300/80 p-1 dark:border-slate-500 dark:bg-nightIndigo-900/70">
            <Button
              variant={billingCycle === "Monthly" ? "contained" : "text"}
              size="xs"
              onClick={() => setBillingCycle("Monthly")}
              className={classNames(
                "rounded-full border-transparent px-4 py-2 normal-case",
                billingCycle !== "Monthly" &&
                  "text-midnightBlue-600 dark:text-lavenderHaze-600",
              )}
              aria-pressed={billingCycle === "Monthly"}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "Yearly" ? "contained" : "text"}
              size="xs"
              onClick={() => setBillingCycle("Yearly")}
              className={classNames(
                "rounded-full border-transparent px-4 py-2 normal-case",
                billingCycle !== "Yearly" &&
                  "text-midnightBlue-600 dark:text-lavenderHaze-600",
              )}
              aria-pressed={billingCycle === "Yearly"}
            >
              Yearly
            </Button>
          </div>
          <p className="ml-3 inline-flex items-center rounded-full bg-limeGreen-500/30 px-3 text-xxs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:bg-limeGreen-500/20 dark:text-limeGreen-500">
            {yearlyBadgeText}
          </p>
        </div>
      )}

      <div className="PlanCards flex w-full flex-col justify-between gap-10 md:flex-row">
        {plansData.map((plan: Plan) => {
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              userData={userData}
              currencySymbol={currencySymbol}
              popularBadgeLabel={popularBadgeLabel}
              billingCycle={billingCycle}
              yearlyDiscount={yearlyDiscount}
            />
          );
        })}
      </div>

      {!isSignedIn && (
        <div className="mt-8 flex items-center justify-center">
          <Link className="btn btn-lg btn-outlined mt-4" href="/sign-up">
            {subscribeCtaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
