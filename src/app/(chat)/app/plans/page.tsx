import Faqs from "@/components/sections/faqs-section";
import PageWrapper from "@/components/layout/page-wrapper";
import Plans from "@/components/sections/plans-section";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { SUPPORT_EMAIL } from "@/constants/support";
import { auth } from "@clerk/nextjs/server";
import { buildPlans } from "@/constants/plans";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";

export default async function AppPlansPage() {
  const { userId } = await auth();
  const userData = userId ? await ensureUserSynced(userId) : null;
  const { pricing, limits } = await getEffectivePlanConfig();
  const plans = buildPlans({ pricing, limits });

  return userData ? (
    <PageWrapper id="AppPlansPage" scrollable>
      <Plans userData={userData} hasLoader plansData={plans} />
      <Faqs />
    </PageWrapper>
  ) : (
    <div className="AppPlansPage flex h-dvh items-center justify-center">
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
