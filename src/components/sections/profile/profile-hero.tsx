import PlanPromo from "@/components/shared/plan-promo";
import { PromoContent } from "@/constants/promo-content";

import getFormattedDate from "@/lib/utils/getFormattedDate";
import getFullName, { getNameLetters } from "@/lib/utils/getFullName";
import { UserData } from "@/types/UserData.d";
import classNames from "classnames";

interface HeroProps {
  userData: UserData;
  supportEmail: string;
  promoContent: PromoContent;
}

export default function ProfileHero({
  userData,
  supportEmail,
  promoContent,
}: HeroProps) {
  const { username, firstName, lastName, email, registerAt, updatedAt, plan } =
    userData;
  const formattedRegisterAt = getFormattedDate(registerAt);
  const formattedUpdatedAt = getFormattedDate(updatedAt);
  const formattedPlanExpiresOn =
    plan.name === "Lite" ? "Never" : getFormattedDate(plan.expiresOn);

  const fullName = getFullName({
    firstName: firstName || "",
    lastName: lastName || "",
    username: username || "",
  });
  const initials = getNameLetters(fullName).children;

  const profileCardClass = classNames(
    "flex w-full flex-col items-center justify-between gap-8 rounded-lg border p-6 shadow-md md:flex-row",
    "border-lavenderHaze-500 bg-lavenderHaze-500/50",
    "dark:border-nightIndigo-300/10 dark:bg-nightIndigo-500/30",
  );

  const avatarClass = classNames(
    "inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full",
    "bg-lavenderHaze-500 text-2xl text-white",
    "shadow-[0px_0px_5px_0px_rgba(122,75,204,0.3)]",
  );

  return (
    <section className="ProfileHero mx-auto flex w-full max-w-7xl px-4">
      <div className={profileCardClass}>
        <div className="flex flex-1 items-center gap-4 lg:gap-8">
          <span className={avatarClass}>
            {userData.userimg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userData.userimg}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <div className="flex flex-1 flex-col">
            <h2 className="heading-4">{fullName}</h2>
            <p className="body-1">{email}</p>
          </div>
        </div>

        <div className="flex w-full flex-col justify-between gap-2 lg:max-w-[30%]">
          <div className="flex items-center gap-2">
            <span className="font-semibold leading-none">Member since:</span>
            <span className="text-xxs leading-none">{formattedRegisterAt}</span>
          </div>

          {updatedAt && (
            <div className="flex items-center gap-2">
              <span className="font-semibold leading-none">Last update:</span>
              <span className="text-xxs leading-none">
                {formattedUpdatedAt}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-semibold leading-none">Plan expires:</span>
            <span className="text-xxs leading-none">
              {formattedPlanExpiresOn}
            </span>
          </div>
        </div>

        <div className="flex w-full lg:max-w-[25%]">
          <PlanPromo
            plan={plan}
            role={userData.role}
            isSuspended={userData.suspended}
            supportEmail={supportEmail}
            promoContent={promoContent}
          />
        </div>
      </div>
    </section>
  );
}
