import Plans from "@/components/sections/plans-section";
import Faqs from "@/components/sections/faqs-section";
import { buildPlans } from "@/constants/plans";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const { pricing, limits } = await getEffectivePlanConfig();
  const plans = buildPlans({ pricing, limits });

  return (
    <section className="PlansPage mx-auto mt-14 flex w-full max-w-screen-2xl flex-1 flex-col gap-10 pb-10">
      <Plans plansData={plans} />
      <Faqs />
    </section>
  );
}
