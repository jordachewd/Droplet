import Plans from "@/components/sections/shared/plans-section";
import Faqs from "@/components/sections/shared/faqs-section";
import { buildPlans } from "@/constants/plans";
import { getEffectiveFaqContent } from "@/lib/utils/effective-faq-content";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";
import Link from "next/link";
import PageWrapper from "@/components/layout/page-wrapper";
import PageHead from "@/components/layout/page-head";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [effectivePlanConfig, personaAccessByPlan, supportEmail, promoContent] =
    await Promise.all([
      getEffectivePlanConfig(),
      getEffectivePersonaAccessByPlan(),
      getEffectiveSupportEmail(),
      getEffectivePromoContent(),
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

  return (
    <PageWrapper id="PlansPageWrapper">
      <PageHead
        title="Choose your plan"
        subtitle="Select the plan that suits your needs!"
        align="center"
      />

      <Plans
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
        subscribeCtaLabel={promoContent.plansSubscribeCta}
        popularBadgeLabel={promoContent.planPopularBadge}
      />

      <Faqs faqsData={faqs} />

      <section className="flex w-full p-4 max-w-screen-2xl mx-auto">
        <div className="flex w-full flex-col p-8 gap-4 rounded-2xl border shadow-sm bg-lavenderHaze-200/85 dark:bg-nightIndigo-900/82">
          <h2 className="heading-5">Still need help?</h2>
          <p className="body-2 mt-3 max-w-2xl text-sm md:text-base">
            Review the public plans page for limits and pricing, or reach out to
            the support contact listed below if you need account or billing
            help.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link className="btn btn-lg btn-contained uppercase" href="/plans">
              View plans
            </Link>
            <Link
              className="btn btn-lg btn-outlined uppercase"
              href={`mailto:${supportEmail}`}
            >
              Contact support
            </Link>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
