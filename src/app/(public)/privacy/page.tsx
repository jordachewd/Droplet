import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import { SUPPORT_EMAIL } from "@/constants/support";

export const metadata: Metadata = {
  title: "Privacy Policy | Droplet",
  description:
    "Review how Droplet handles account data, conversations, files, billing records, cookies, and third-party service providers.",
};

const legalReviewDisclaimer =
  "This policy is provided for informational purposes. Legal review recommended before production publication.";

const privacySections = [
  {
    title: "What Droplet collects",
    paragraphs: [
      "Droplet collects account information needed to operate the service, including identifiers supplied through Clerk, profile details you provide, and billing records associated with plan purchases.",
      "When you use the product, Droplet also processes conversation content, uploaded files, generated media references, and service metadata such as timestamps, plan state, and usage counters required to enforce limits and support the product.",
    ],
  },
  {
    title: "How that information is used",
    paragraphs: [
      "Droplet uses collected information to authenticate users, deliver chat and media features, maintain conversation history, enforce plan entitlements, process billing, and investigate support or security issues.",
      "Usage metadata may also be processed for reliability, abuse prevention, cost control, operational analytics, and product improvement. Droplet should not use personal data for unrelated marketing or resale without explicit approval and notice.",
    ],
  },
  {
    title: "Third-party service providers",
    paragraphs: [
      "Droplet relies on third-party processors to deliver core service functions. These include OpenAI for model responses, Clerk for authentication and session management, Stripe for payments, and AWS S3 for file storage.",
      "Those providers may process only the information necessary for their role in delivering the service. Droplet operators should maintain written agreements, access controls, and retention policies appropriate to each provider relationship.",
    ],
  },
  {
    title: "Storage, retention, and security",
    paragraphs: [
      "Conversation records, uploaded assets, and billing data are retained for as long as needed to operate the service, satisfy support obligations, enforce limits, and meet legal or accounting requirements. Retention periods should be finalized through legal and operational review before production publication.",
      "Droplet is designed to apply authentication, ownership checks, provider signature verification, upload validation, and other security controls at service boundaries. No system can guarantee absolute security, so the operator should continue to harden infrastructure and monitor for abuse.",
    ],
  },
  {
    title: "Cookies, local storage, and similar technologies",
    paragraphs: [
      "Droplet uses essential authentication technologies through Clerk and stores interface preferences such as theme and sidebar state in browser storage. More detail appears in the dedicated Cookie Policy.",
      "For the current public experience, the documented browser storage keys include `droplet-theme-mode`, `droplet-sidebar-collapsed`, and the legacy migration keys `cellesseon-theme-mode` and `cellesseon-sidebar-collapsed`.",
    ],
  },
  {
    title: "User rights and contact",
    paragraphs: [
      "Users should have a way to request access, correction, deletion, or export of data subject to legal, billing, fraud-prevention, and security constraints. Exact response timelines and jurisdiction-specific rights should be finalized before production use.",
      `For privacy inquiries, support requests, or escalation related to account data, contact \`${SUPPORT_EMAIL}\` unless and until Droplet publishes a different official privacy contact.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section className="PrivacyPage mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-[2rem] border px-6 py-10 shadow-sm",
          "border-lightBorders-400/80 bg-white/76",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
        )}
      >
        <PageHead
          title="Privacy Policy"
          subtitle="How Droplet handles account data, conversations, stored assets, billing records, and provider integrations."
        />
        <p className="body-2 mt-5 rounded-2xl bg-lightAccent-100/90 px-4 py-3 text-sm dark:bg-darkAccent-1000/80">
          {legalReviewDisclaimer}
        </p>
      </div>

      {privacySections.map((section) => (
        <article
          key={section.title}
          className={classNames(
            "rounded-[2rem] border px-6 py-7 shadow-sm",
            "border-lightBorders-400/80 bg-white/76",
            "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
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

      <div
        className={classNames(
          "rounded-[2rem] border px-6 py-7 shadow-sm",
          "border-lightBorders-400/80 bg-lightBackground-200/85",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
        )}
      >
        <h2 className="heading-5">Related policy pages</h2>
        <p className="body-2 mt-3 text-sm md:text-base">
          Review the dedicated Cookie Policy for browser storage details and the
          Terms &amp; Conditions page for account, billing, and service-use
          rules.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-lg btn-contained uppercase" href="/cookies">
            Cookie policy
          </Link>
          <Link className="btn btn-lg btn-outlined uppercase" href="/terms">
            Terms &amp; conditions
          </Link>
        </div>
      </div>
    </section>
  );
}
