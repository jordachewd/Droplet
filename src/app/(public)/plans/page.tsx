import PlansSection from "@/components/sections/shared/PlansSection";
import Faqs from "@/components/sections/shared/FaqsSection";
import { buildPlans } from "@/constants/plans";
import { getEffectiveFaqContent } from "@/lib/utils/effective-faq-content";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectiveStripeBillingConfig } from "@/lib/utils/effective-stripe-billing-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import { getEffectivePromoContent } from "@/lib/utils/effective-promo-content";

import PageHead from "@/components/layout/PageHead";
import CtaBannerSection from "@/components/sections/shared/CtaBannerSection";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [
    effectivePlanConfig,
    personaAccessByPlan,
    supportEmail,
    promoContent,
    stripeBillingConfig,
  ] = await Promise.all([
    getEffectivePlanConfig(),
    getEffectivePersonaAccessByPlan(),
    getEffectiveSupportEmail(),
    getEffectivePromoContent(),
    getEffectiveStripeBillingConfig(),
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
    <>
      <PageHead
        id="plans-page-head"
        title="Choose your plan"
        subtitle="Select the plan that suits your needs!"
        align="center"
      />

      <PlansSection
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
        subscribeCtaLabel={promoContent.plansSubscribeCta}
        popularBadgeLabel={promoContent.planPopularBadge}
        yearlyDiscount={stripeBillingConfig.yearlyDiscount}
      />

      <Faqs faqsData={faqs} />

      <CtaBannerSection
        id="plans-cta-banner"
        copy={{
          ctaHeading: "Still need help?",
          ctaDescription:
            "Review the public plans page for limits and pricing, or reach out to the support contact listed below if you need account or billing help.",
          ctaPrimaryLabel: "Contact support",
          ctaPrimaryLink: `mailto:${supportEmail}`,
          ctaSecondaryLabel: "View plans",
          ctaSecondaryLink: "/plans",
        }}
      />
    </>
  );
}
