import ProfileBilling from "@/components/sections/profile-billing";
import ProfileHero from "@/components/sections/profile-hero";
import RouteGroupLayout from "@/components/layout/route-group-layout";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import { getAllTransactions } from "@/lib/actions/transaction.action";
import { getUserById } from "@/lib/actions/user.actions";
import { Transaction } from "@/types/TransactionData.d";
import { UserData } from "@/types/UserData.d";
import { auth } from "@clerk/nextjs/server";

export default async function AppProfilePage() {
  const { userId } = await auth();
  let userData: UserData | null = null;
  let userTxns: Transaction[] | null = null;

  if (userId) {
    userData = await getUserById(userId);
    userTxns = (userData?.plan && (await getAllTransactions(userId))) || null;
  }

  const stripeId = userData?.plan?.stripeId || null;

  return userData ? (
    <RouteGroupLayout>
      <ProfileHero userData={userData} />
      <ProfileBilling stripeId={stripeId} userTxns={userTxns} />
    </RouteGroupLayout>
  ) : (
    <div className="flex h-dvh items-center justify-center">
      <LoadingBubbles />
    </div>
  );
}
