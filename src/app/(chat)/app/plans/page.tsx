import Faqs from "@/components/sections/shared/faqs-section";
import ChatPageWrapper from "@/components/chat/chat-page-wrapper";
import Plans from "@/components/sections/shared/plans-section";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { auth } from "@clerk/nextjs/server";
import { buildPlans } from "@/constants/plans";
import { buildFaqs } from "@/constants/faqs";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import PageHead from "@/components/layout/page-head";

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
  const faqs = buildFaqs({
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
      />

      <Plans
        userData={userData}
        hasLoader
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
      />
      <Faqs faqsData={faqs} />
    </ChatPageWrapper>
  ) : (
    <div className="AppPlansPage flex h-dvh items-center justify-center">
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
            href="/app/plans"
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Retry
          </a>
        </div>
      </div>
    </div>
  );
}
