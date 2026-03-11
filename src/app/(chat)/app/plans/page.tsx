import Faqs from "@/components/sections/faqs-section";
import RouteGroupLayout from "@/components/layout/route-group-layout";
import Plans from "@/components/sections/plans-section";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import { getUserById } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { auth } from "@clerk/nextjs/server";

export default async function AppPlansPage() {
  const { userId } = await auth();
  let userData: UserData | null = null;

  if (userId) {
    userData = await getUserById(userId);
  }

  return userData ? (
    <RouteGroupLayout>
      <Plans userData={userData} hasLoader />
      <Faqs />
    </RouteGroupLayout>
  ) : (
    <div className="flex h-dvh items-center justify-center">
      <LoadingBubbles />
    </div>
  );
}
