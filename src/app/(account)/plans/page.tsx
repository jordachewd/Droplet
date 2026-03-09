import Faqs from "@/components/sections/faqs-section";
import Plans from "@/components/sections/plans-section";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import { getUserById } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { auth } from "@clerk/nextjs/server";

export default async function PlansPage() {
  const { userId } = await auth();
  let userData: UserData | null = null;

  if (userId) {
    userData = await getUserById(userId);
  }

  return (
    <>
      {userData ? (
        <>
          <Plans userData={userData} hasLoader />
          <Faqs />
        </>
      ) : (
        <div className="flex justify-center items-center h-dvh">
          <LoadingBubbles />
        </div>
      )}
    </>
  );
}
