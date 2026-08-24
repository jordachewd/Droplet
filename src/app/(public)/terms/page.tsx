import type { Metadata } from "next";
import PageHead from "@/components/layout/PageHead";
import {
  buildTermsSections,
  legalReviewDisclaimer,
} from "@/constants/terms-data";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";
import PublicSection from "@/components/public/PublicSection";
import ContentCard from "@/components/layout/ContentCard";

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
    <>
      <PageHead
        id="terms-page-head"
        title="Terms & Conditions"
        subtitle="Draft service terms covering account use, pricing, AI-generated content, suspension, and legal review requirements."
        align="center"
      />

      <PublicSection
        id="terms-section"
        sectionClass="terms-section"
        wrapperClass="terms-wrapper"
      >
        <div className="flex flex-col w-full gap-6">
          <p className="body-2 -mt-6 mb-4 text-sm text-center">
            {legalReviewDisclaimer}
          </p>

          {termsSections.map((section, index) => (
            <ContentCard key={section.title + index} title={section.title}>
              {section.paragraphs.map((paragraph, i) => (
                <p
                  key={paragraph + i}
                  className="body-2 text-sm md:text-base my-2"
                >
                  {paragraph}
                </p>
              ))}
            </ContentCard>
          ))}
        </div>
      </PublicSection>
    </>
  );
}
