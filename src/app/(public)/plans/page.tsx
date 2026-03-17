import Plans from "@/components/sections/plans-section";
import Faqs from "@/components/sections/faqs-section";
import { buildPlans } from "@/constants/plans";
import { buildFaqs } from "@/constants/faqs";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [effectivePlanConfig, personaAccessByPlan] = await Promise.all([
    getEffectivePlanConfig(),
    getEffectivePersonaAccessByPlan(),
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
  });

  return (
    <section className="PlansPage mx-auto mt-14 flex w-full max-w-screen-2xl flex-1 flex-col gap-10 pb-10">
      <Plans
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
      />
      <Faqs faqsData={faqs} />
    </section>
  );
}
