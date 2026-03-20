import ProfileBilling from "@/components/sections/profile-billing";
import ProfileHero from "@/components/sections/profile-hero";
import ProfileUsage from "@/components/sections/profile-usage";
import PageWrapper from "@/components/layout/page-wrapper";
import { getAllTransactions } from "@/lib/actions/transaction.action";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { Transaction } from "@/types/TransactionData.d";
import { auth } from "@clerk/nextjs/server";

export default async function AppProfilePage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  let userTxns: Transaction[] | null = null;

  const [effectivePlanConfig, supportEmail] = await Promise.all([
    getEffectivePlanConfig(),
    getEffectiveSupportEmail(),
  ]);

  if (userData?.plan) {
    userTxns = (await getAllTransactions(userId!)) || null;
  }

  const stripeId = userData?.plan?.stripeId || null;
  const planName = userData?.plan?.name ?? "Lite";
  const planLimits = effectivePlanConfig.limits[planName];
  const imageUsed = userData?.plan?.imageGenerations ?? 0;
  const audioUsed = userData?.plan?.audioGenerations ?? 0;
  const videoUsed = userData?.plan?.videoGenerations ?? 0;
  const dailyConversationsUsed = userData?.dailyConversationsStarted ?? 0;
  const usagePeriodStart = userData?.plan?.usagePeriodStart
    ? new Date(userData.plan.usagePeriodStart)
    : undefined;

  return userData ? (
    <PageWrapper id="AppProfilePage" scrollable>
      <ProfileHero userData={userData} />
      <ProfileUsage
        planName={planName}
        planLimits={planLimits}
        imageUsed={imageUsed}
        audioUsed={audioUsed}
        videoUsed={videoUsed}
        dailyConversationsUsed={dailyConversationsUsed}
        usagePeriodStart={usagePeriodStart}
      />
      <ProfileBilling stripeId={stripeId} userTxns={userTxns} />
    </PageWrapper>
  ) : (
    <div className="AppProfilePage flex h-dvh items-center justify-center">
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
        <p className="mb-4 text-red-700 dark:text-red-300">
          We&apos;re having trouble loading your account. Please try refreshing
          the page or contact support.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`mailto:${supportEmail}`}
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
