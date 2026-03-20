import Plans from "@/components/sections/plans-section";
import Faqs from "@/components/sections/faqs-section";
import { buildPlans } from "@/constants/plans";
import { buildFaqs } from "@/constants/faqs";
import {
  getEffectivePlanConfig,
  getEffectiveSupportEmail,
} from "@/lib/utils/effective-plan-config";
import { getEffectivePersonaAccessByPlan } from "@/lib/utils/effective-persona-access";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
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

  return (
    <section className="PlansPage mx-auto mt-14 flex w-full max-w-screen-2xl flex-1 flex-col gap-10 pb-10">
      <Plans
        plansData={plans}
        currencySymbol={effectivePlanConfig.pricing.currencySymbol}
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
    </section>
  );
}
