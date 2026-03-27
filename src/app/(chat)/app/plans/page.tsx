import Faqs from "@/components/sections/shared/faqs-section";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import Plans from "@/components/sections/shared/plans-section";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { auth } from "@clerk/nextjs/server";
import { buildPlans } from "@/constants/plans";
import { getEffectiveFaqContent } from "@/lib/utils/effective-faq-content";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import PageHead from "@/components/layout/page-head";
import AccountLoadErrorState from "@/components/shared/account-load-error-state";

export default async function AppPlansPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  const [effectivePlanConfig, personaAccessByPlan, supportEmail] =
    await Promise.all([
      getEffectivePlanConfig(),
      getEffectivePersonaAccessByPlan(),
      getEffectiveSupportEmail(),
    ]);
  const plans = buildPlans({
    pricing: effectivePlanConfig.pricing,
    limits: effectivePlanConfig.limits,
    personaAccess: personaAccessByPlan,
    trialLimits: effectivePlanConfig.trialLimits,
  });
  const faqs = await getEffectiveFaqContent({
    pricing: effectivePlanConfig.pricing,
    personaAccessByPlan,
    currencySymbol: effectivePlanConfig.pricing.currencySymbol,
    supportEmail,
  });

  return userData ? (
    <ChatPageWrapper id="AppPlansPage" scrollable>
      <PageHead
        title="Upgrade your plan"
        subtitle="Select the plan that suits your needs!"
        align="center"
        className="px-4 mt-12"
      />

      <Plans
        userData={userData}
        hasLoader
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
        className="max-w-7xl!"
      />
      <Faqs faqsData={faqs} />
    </ChatPageWrapper>
  ) : (
    <AccountLoadErrorState
      supportEmail={supportEmail}
      retryHref="/app/plans"
      containerClassName="AppPlansPage"
    />
  );
}
