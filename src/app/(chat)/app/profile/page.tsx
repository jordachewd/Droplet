import ProfileBilling from "@/components/sections/profile-billing";
import ProfileHero from "@/components/sections/profile-hero";
import RouteGroupLayout from "@/components/layout/route-group-layout";
import { getAllTransactions } from "@/lib/actions/transaction.action";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { SUPPORT_EMAIL } from "@/constants/support";
import { Transaction } from "@/types/TransactionData.d";
import { auth } from "@clerk/nextjs/server";

export default async function AppProfilePage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  let userTxns: Transaction[] | null = null;

  if (userData?.plan) {
    userTxns = (await getAllTransactions(userId!)) || null;
  }

  const stripeId = userData?.plan?.stripeId || null;

  return userData ? (
    <RouteGroupLayout>
      <ProfileHero userData={userData} />
      <ProfileBilling stripeId={stripeId} userTxns={userTxns} />
    </RouteGroupLayout>
  ) : (
    <div className="AppProfilePage flex h-dvh items-center justify-center">
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
        <p className="mb-4 text-red-700 dark:text-red-300">
          We&apos;re having trouble loading your account. Please try refreshing
          the page or contact support.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Contact Support
          </a>
          <a
            href="/app/profile"
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Retry
          </a>
        </div>
      </div>
    </div>
  );
}
