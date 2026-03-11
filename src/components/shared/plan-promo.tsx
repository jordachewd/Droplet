import classNames from "classnames";
import { getPlanIcon } from "@/constants/plans";
import { PlanName } from "@/types/PlanData.d";
import Link from "next/link";
import { getUserById } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { auth } from "@clerk/nextjs/server";

export default async function PlanPromo() {
  const { userId } = await auth();
  const userData = userId
    ? ((await getUserById(userId)) as UserData | null)
    : null;

  const userPlan = userData?.plan || null;

  if (!userPlan) return null;

  const { id, name, billing } = userPlan;
  const isLite = name === "Lite";
  const isPremium = Number(id) === 2 && billing === "Yearly";
  const isPremiumFull = isPremium && name === "Premium";

  const promoCardClass = classNames(
    "PlanPromo relative flex w-full flex-col items-center gap-1 overflow-hidden rounded-lg p-4 shadow-md",
    "bg-lightAccent-500 text-darkAccent-1000",
    "dark:bg-darkAccent-500 dark:text-darkAccent-1000",
  );

  const promoAccentClass = classNames(
    "absolute -top-1/2 right-1/3 z-0 flex h-[150%] w-full -rotate-45 items-center justify-center rounded-lg opacity-50",
    "bg-lightAccent-700/60 dark:bg-darkAccent-700/70",
  );

  return (
    <div className={promoCardClass}>
      <div className={promoAccentClass}></div>

      <div className="z-10 flex w-full flex-col gap-3 text-center">
        <div className="absolute right-0.5 top-0.5 z-10 flex items-center gap-1 font-medium">
          <span
            className={classNames(
              "rounded-[5px] px-1 py-1 text-2xs uppercase leading-none tracking-wider",
              "bg-lightAccent-900 text-lightAccent-300",
              "dark:bg-darkAccent-1000 dark:text-darkAccent-400",
              { "min-w-[82px]": !isLite },
            )}
          >
            {isLite ? "Free forever" : "Your plan"}
          </span>
        </div>

        <h2 className="heading-6 flex items-center justify-center gap-4 capitalize text-darkAccent-1000">
          <i
            className={classNames(getPlanIcon(name as PlanName), "text-3xl")}
          ></i>
          <span>{name}</span>
        </h2>

        {!isPremiumFull && (
          <>
            <div className="flex w-full items-center justify-center border-t border-dotted border-darkAccent-1000 pt-2.5 text-xs">
              Unlock premium features with an upgrade!
            </div>
            <Link
              className="btn btn-sm btn-contained self-center"
              href="/app/plans"
            >
              Upgrade now
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
