"use client";

import { useUser } from "@clerk/nextjs";
import { Plan } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import PlanCard from "@/components/shared/plan-card";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import Link from "next/link";
import classNames from "classnames";

interface PlansProps {
  userData?: UserData | null;
  hasLoader?: boolean;
  plansData: Plan[];
  currencySymbol?: string;
  subscribeCtaLabel?: string;
  popularBadgeLabel?: string;
  className?: string;
}

export default function Plans({
  userData,
  hasLoader = false,
  plansData,
  currencySymbol = "$",
  subscribeCtaLabel = "Subscribe Now",
  popularBadgeLabel = "Popular",
  className = "",
}: PlansProps) {
  const { isSignedIn } = useUser();

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

  return (
    <section className={wrapperClassName}>
      <div className="PlanCards flex w-full flex-col justify-between gap-10 md:flex-row">
        {plansData.map((plan: Plan) => {
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              userData={userData}
              currencySymbol={currencySymbol}
              popularBadgeLabel={popularBadgeLabel}
            />
          );
        })}
      </div>

      {!isSignedIn && (
        <div className="mt-8 flex items-center justify-center">
          <Link
            className="btn btn-lg btn-outlined mt-4 w-full max-w-70 p-4 uppercase"
            href="/sign-up"
          >
            {subscribeCtaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
