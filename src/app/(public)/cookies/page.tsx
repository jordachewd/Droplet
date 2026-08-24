import type { Metadata } from "next";
import PageHead from "@/components/layout/PageHead";
import {
  cookieCategories,
  legalReviewDisclaimer,
} from "@/constants/cookies-data";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import PublicSection from "@/components/public/PublicSection";
import CtaBannerSection from "@/components/sections/shared/CtaBannerSection";
import ContentCard from "@/components/layout/ContentCard";

export const metadata: Metadata = {
  title: "Cookie Policy | Droplet",
  description:
    "Review the essential cookies and browser storage preferences used by Droplet, including Clerk auth cookies and legacy migration keys.",
};

export default async function CookiesPage() {
  const supportEmail = await getEffectiveSupportEmail();

  return (
    <>
      <PageHead
        id="cookies-page-head"
        title="Cookie Policy"
        subtitle="What Droplet stores in the browser today, why it is needed, and what should be disclosed before adding anything optional."
        align="center"
      />

      <PublicSection
        id="cookies-section"
        sectionClass="cookies-section"
        wrapperClass="cookies-wrapper"
      >
        <div className="flex flex-col w-full gap-6">
          <p className="body-2 -mt-6 mb-4 text-sm text-center">
            {legalReviewDisclaimer}
          </p>

          {cookieCategories.map((category, index) => (
            <ContentCard
              key={category.title + index}
              title={category.title}
              description={category.description}
            />
          ))}
        </div>
      </PublicSection>

      <CtaBannerSection
        id="cookies-cta-banner"
        copy={{
          ctaHeading: "Managing browser preferences",
          ctaDescription:
            "You can usually clear cookies and local storage through your browser settings. Doing so may sign you out of Droplet and reset interface preferences such as theme mode and sidebar state.",
          ctaPrimaryLabel: "Privacy policy",
          ctaPrimaryLink: "/privacy",
          ctaSecondaryLabel: "Ask a question",
          ctaSecondaryLink: `mailto:${supportEmail}`,
        }}
      />
    </>
  );
}
