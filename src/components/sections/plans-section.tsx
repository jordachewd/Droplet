"use client";
import { plans } from "@/constants/plans";
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
  maxWidthClass?: string;
}

export default function Plans({
  userData,
  hasLoader = false,
  maxWidthClass = "max-w-6xl",
}: PlansProps) {
  const { isSignedIn } = useUser();
  const shouldShowUpgradeLabel = Boolean(userData) || isSignedIn;

  if (hasLoader && !userData)
    return (
      <div className="Plans flex h-96 w-full items-center justify-center">
        <LoadingBubbles />
      </div>
    );

  const wrapperClassName = classNames(
    "Plans mx-auto flex w-full flex-col gap-6 p-4",
    maxWidthClass,
  );

  return (
    <div className={wrapperClassName}>
      <PageHead
        title={`${shouldShowUpgradeLabel ? "Upgrade" : "Choose"} your plan`}
        subtitle="Select the plan that suits your needs!"
      />

      <div className="flex w-full flex-col justify-between gap-6 md:flex-row md:gap-4 lg:gap-8">
        {plans.map((plan: Plan) => {
          return <PlanCard key={plan.id} plan={plan} userData={userData} />;
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
    </div>
  );
}
