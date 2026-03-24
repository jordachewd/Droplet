import ProfileHeroEditor from "@/components/sections/profile/profile-hero-editor";
import PlanPromo from "@/components/shared/plan-promo";
import PlanCountDown from "@/components/shared/plan-count-down";
import PageHead from "@/components/layout/page-head";
import getFormattedDate from "@/lib/utils/getFormattedDate";
import getFullName, { getNameLetters } from "@/lib/utils/getFullName";
import { UserData } from "@/types/UserData.d";
import classNames from "classnames";

interface HeroProps {
  userData: UserData;
}

export default function ProfileHero({ userData }: HeroProps) {
  const { username, firstName, lastName, email, registerAt, updatedAt, plan } =
    userData;
  const formattedRegisterAt = getFormattedDate(registerAt);
  const formattedUpdatedAt = getFormattedDate(updatedAt);

  const fullName = getFullName({
    firstName: firstName || "",
    lastName: lastName || "",
    username: username || "",
  });
  const initials = getNameLetters(fullName).children;

  const profileCardClass = classNames(
    "flex w-full flex-col items-center justify-between gap-8 rounded-lg border p-6 shadow-md md:flex-row",
    "border-lavenderHaze-500 bg-lavenderHaze-500/50",
    "dark:border-nightIndigo-500 dark:bg-nightIndigo-500/30",
  );

  const avatarClass = classNames(
    "inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full",
    "bg-lavenderHaze-500 text-2xl text-white",
    "shadow-[0px_0px_5px_0px_rgba(122,75,204,0.3)]",
  );

  return (
    <section className="ProfileHero mx-auto flex w-full max-w-6xl flex-col gap-8 p-4">
      <PageHead title="Profile" subtitle="Manage your account settings" />

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
            <span className="font-semibold leading-none">
              {plan.name === "Lite" ? "Plan expires:" : "Plan expires in:"}
            </span>
            {plan.name === "Lite" ? (
              <span className="text-xxs leading-none">Never</span>
            ) : (
              <PlanCountDown endDate={plan.expiresOn as Date} wrapped />
            )}
          </div>
        </div>

        <div className="flex w-full lg:max-w-[25%]">
          <PlanPromo plan={plan} role={userData.role} />
        </div>
      </div>

      <ProfileHeroEditor userData={userData} />
    </section>
  );
}
