import type { Metadata } from "next";
import classNames from "classnames";
import PageHead from "@/components/layout/page-head";
import {
  buildTermsSections,
  legalReviewDisclaimer,
} from "@/constants/terms-data";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import PageWrapper from "@/components/layout/page-wrapper";

export const metadata: Metadata = {
  title: "Terms & Conditions | Droplet",
  description:
    "Review the draft Droplet terms for service use, account rules, plan pricing, AI-generated content, and liability limitations.",
};

export default async function TermsPage() {
  const effectivePlanConfig = await getEffectivePlanConfig();
  const termsSections = buildTermsSections({
    pricing: effectivePlanConfig.pricing,
    currencySymbol: effectivePlanConfig.pricing.currencySymbol,
  });

  return (
    <PageWrapper id="PrivacyPage" className="gap-8!">
      <PageHead
        title="Terms & Conditions"
        subtitle="Draft service terms covering account use, pricing, AI-generated content, suspension, and legal review requirements."
      />
      <p className="body-2 -mt-6 mb-4 text-sm">{legalReviewDisclaimer}</p>

      {termsSections.map((section) => (
        <article
          key={section.title}
          className={classNames(
            "rounded-2xl px-6 py-7 shadow-sm",
            "bg-lavenderHaze-100/76 dark:bg-nightIndigo-900/82",
          )}
        >
          <h2 className="heading-5">{section.title}</h2>
          <div className="mt-4 flex flex-col gap-4">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="body-2 text-sm md:text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      ))}
    </PageWrapper>
  );
}
