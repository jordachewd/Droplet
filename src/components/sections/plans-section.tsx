"use client";
import classNames from "classnames";
import { plans } from "@/constants/plans";
import { useEffect, useState } from "react";
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
  const save = 0.4;
  const { isSignedIn } = useUser();
  const billing = userData?.plan?.billing;
  const [yearly, setYearly] = useState<boolean>(billing === "Yearly");

  useEffect(() => {
    setYearly(billing === "Yearly");
  }, [billing]);

  const cssMonthly = !yearly
    ? "opacity-100 text-lightAccent-700 dark:text-darkAccent-500"
    : "opacity-60";
  const cssYearly = yearly
    ? "opacity-100 text-lightAccent-700 dark:text-darkAccent-500"
    : "opacity-60";

  const yearlySwitchClass = classNames(
    "h-6 w-11 rounded-full bg-lightBorders-700 transition-colors",
    "after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5",
    "after:rounded-full after:bg-white after:transition-transform",
    "peer-checked:bg-darkSecondary-500 peer-checked:after:translate-x-full",
    "dark:bg-darkBorders-600",
  );

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
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <p className={classNames("transition-all duration-500", cssMonthly)}>
            Monthly
          </p>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              checked={yearly}
              onChange={(event) => setYearly(event.target.checked)}
              aria-label="Toggle yearly billing"
              type="checkbox"
              className="peer sr-only"
            />
            <span className={yearlySwitchClass}></span>
          </label>
          <p className={classNames("transition-all duration-500", cssYearly)}>
            Yearly
          </p>
          <span className="rounded bg-orange-600 p-1 text-xxs leading-none text-white shadow-sm">
            Save {save * 100}%
          </span>
        </div>
      </PageHead>

      <div className="flex w-full flex-col justify-between gap-6 md:flex-row md:gap-4 lg:gap-8">
        {plans.map((plan: Plan) => {
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              yearly={yearly}
              userData={userData}
              save={save}
            />
          );
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
