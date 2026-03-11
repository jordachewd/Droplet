"use client";
import { plans } from "@/constants/plans";
import { useUser } from "@clerk/nextjs";
import { Plan } from "@/types/PlanData.d";
import { UserData } from "@/types/UserData.d";
import PageHead from "../layout/page-head";
import PlanCard from "@/components/shared/plan-card";
import LoadingBubbles from "../shared/loading-bubbles";
import Link from "next/link";

interface PlansProps {
  userData?: UserData | null;
  hasLoader?: boolean;
}

export default function Plans({ userData, hasLoader = false }: PlansProps) {
  const { isSignedIn } = useUser();

  if (hasLoader && !userData)
    return (
      <div className="Plans flex h-96 w-full items-center justify-center">
        <LoadingBubbles />
      </div>
    );

  return (
    <div className="Plans mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <PageHead
        title={`${isSignedIn ? "Upgrade" : "Choose"} your plan`}
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
            className="btn btn-lg btn-outlined mt-4 w-full max-w-[280px] p-4 uppercase"
            href="/sign-up"
          >
            Subscribe Now
          </Link>
        </div>
      )}
    </div>
  );
}
