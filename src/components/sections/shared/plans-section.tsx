"use client";

import { useUser } from "@clerk/nextjs";
import { Plan } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import PageHead from "@/components/layout/page-head";
import PlanCard from "@/components/shared/plan-card";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import Link from "next/link";
import classNames from "classnames";

interface PlansProps {
  userData?: UserData | null;
  hasLoader?: boolean;
  plansData: Plan[];
  currencySymbol?: string;
}

export default function Plans({
  userData,
  hasLoader = false,
  plansData,
  currencySymbol = "$",
}: PlansProps) {
  const { isSignedIn } = useUser();

  if (hasLoader && !userData)
    return (
      <div className="Plans flex h-96 w-full items-center justify-center">
        <LoadingBubbles />
      </div>
    );

  const wrapperClassName = classNames(
    "Plans mx-auto flex w-full flex-col gap-22 p-4 max-w-screen-2xl",
  );

  return (
    <section className={wrapperClassName}>
      <PageHead
        title={`${isSignedIn ? "Upgrade" : "Choose"} your plan`}
        subtitle="Select the plan that suits your needs!"
        align="center"
      />

      <div className="PlanCards flex w-full flex-col justify-between gap-10 md:flex-row">
        {plansData.map((plan: Plan) => {
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              userData={userData}
              currencySymbol={currencySymbol}
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
            Subscribe Now
          </Link>
        </div>
      )}
    </section>
  );
}
