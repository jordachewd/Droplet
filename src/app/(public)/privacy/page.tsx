import type { Metadata } from "next";
import PageHead from "@/components/layout/PageHead";
import {
  legalReviewDisclaimer,
  privacySections,
} from "@/constants/privacy-data";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";
import PublicSection from "@/components/public/PublicSection";
import ContentCard from "@/components/layout/ContentCard";
import CtaBannerSection from "@/components/sections/shared/CtaBannerSection";

export const metadata: Metadata = {
  title: "Privacy Policy | Droplet",
  description:
    "Review how Droplet handles account data, conversations, files, billing records, cookies, and third-party service providers.",
};

export default async function PrivacyPage() {
  const supportEmail = await getEffectiveSupportEmail();
  const privacySectionsWithContact = [
    ...privacySections,
    {
      title: "User rights and contact",
      paragraphs: [
        "Users should have a way to request access, correction, deletion, or export of data subject to legal, billing, fraud-prevention, and security constraints. Exact response timelines and jurisdiction-specific rights should be finalized before production use.",
        `For privacy inquiries, support requests, or escalation related to account data, contact \`${supportEmail}\` unless and until Droplet publishes a different official privacy contact.`,
      ],
    },
  ];

  return (
    <>
      <PageHead
        id="privacy-page-head"
        title="Privacy Policy"
        subtitle="How Droplet handles account data, conversations, stored assets, billing records, and provider integrations."
        align="center"
      />

      <PublicSection
        id="privacy-section"
        sectionClass="privacy-section"
        wrapperClass="privacy-wrapper"
      >
        <div className="flex flex-col w-full gap-6">
          <p className="body-2 -mt-6 mb-4 text-sm text-center">
            {legalReviewDisclaimer}
          </p>

          {privacySectionsWithContact.map((section, index) => (
            <ContentCard key={section.title + index} title={section.title}>
              {section.paragraphs.map((paragraph, i) => (
                <p key={paragraph + i} className="body-2 text-sm md:text-base my-2">
                  {paragraph}
                </p>
              ))}
            </ContentCard>
          ))}
        </div>
      </PublicSection>

      <CtaBannerSection
        id="privacy-cta-banner"
        copy={{
          ctaHeading: "Related policy pages",
          ctaDescription:
            "Review the dedicated Cookie Policy for browser storage details and the Terms & Conditions page for account, billing, and service-use rules.",
          ctaPrimaryLabel: "Cookie policy",
          ctaPrimaryLink: "/cookies",
          ctaSecondaryLabel: "Terms & Conditions",
          ctaSecondaryLink: "/terms",
        }}
      />
    </>
  );
}
