import ProfileBilling from "@/components/sections/profile/profile-billing";
import ProfileHero from "@/components/sections/profile/profile-hero";
import ProfileHeroEditor from "@/components/sections/profile/profile-hero-editor";
import ProfileUsage from "@/components/sections/profile/profile-usage";
import ProfileDangerZone from "@/components/sections/profile/profile-danger-zone";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import AccountLoadErrorState from "@/components/shared/account-load-error-state";
import { getAllTransactions } from "@/lib/actions/transaction.action";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import {
  getEffectiveCurrencySymbol,
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import { Transaction } from "@/types/TransactionData.d";
import { auth } from "@clerk/nextjs/server";
import PageHead from "@/components/layout/page-head";

export default async function AppProfilePage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  let userTxns: Transaction[] | null = null;

  const [effectivePlanConfig, supportEmail, promoContent, currencySymbol] =
    await Promise.all([
      getEffectivePlanConfig(),
      getEffectiveSupportEmail(),
      getEffectivePromoContent(),
      getEffectiveCurrencySymbol(),
    ]);

  if (userData?.plan) {
    userTxns = (await getAllTransactions(userId!)) || null;
  }

  const stripeId = userData?.plan?.stripeId || null;
  const planName = userData?.plan?.name ?? "Lite";
  const planLimits = effectivePlanConfig.limits[planName];
  const imageUsed = userData?.plan?.imageGenerations ?? 0;
  const audioUsed = userData?.plan?.audioGenerations ?? 0;
  const dailyConversationsUsed = userData?.dailyConversationsStarted ?? 0;
  const usagePeriodStart = userData?.plan?.usagePeriodStart
    ? new Date(userData.plan.usagePeriodStart)
    : undefined;

  return userData ? (
    <ChatPageWrapper id="AppProfilePage" scrollable>
      <PageHead
        title="Profile"
        subtitle="Manage your account settings"
        align="center"
        className="px-4 mt-12"
      />
      <ProfileHero
        userData={userData}
        supportEmail={supportEmail}
        promoContent={promoContent}
      />
      <ProfileHeroEditor userData={userData} />
      <ProfileUsage
        planName={planName}
        planLimits={planLimits}
        imageUsed={imageUsed}
        audioUsed={audioUsed}
        dailyConversationsUsed={dailyConversationsUsed}
        usagePeriodStart={usagePeriodStart}
      />
      <ProfileBilling
        stripeId={stripeId}
        userTxns={userTxns}
        currencySymbol={currencySymbol}
      />
      <ProfileDangerZone userData={userData} />
    </ChatPageWrapper>
  ) : (
    <AccountLoadErrorState
      supportEmail={supportEmail}
      retryHref="/app/profile"
      containerClassName="AppProfilePage"
    />
  );
}
