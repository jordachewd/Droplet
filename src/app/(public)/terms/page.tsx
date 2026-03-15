import type { Metadata } from "next";
import classNames from "classnames";
import PageHead from "@/components/layout/page-head";

export const metadata: Metadata = {
  title: "Terms & Conditions | Droplet",
  description:
    "Review the draft Droplet terms for service use, account rules, plan pricing, AI-generated content, and liability limitations.",
};

const legalReviewDisclaimer =
  "This policy is provided for informational purposes. Legal review recommended before production publication.";

const termsSections = [
  {
    title: "Service description",
    paragraphs: [
      "Droplet is an account-required SaaS product that provides persona-driven AI conversations together with plan-based access to supported media workflows and account features.",
      "The service may evolve over time, but any public capability claim, pricing promise, or entitlement rule should match the approved product specification and published plan details.",
    ],
  },
  {
    title: "Account responsibilities",
    paragraphs: [
      "Users are responsible for maintaining the security of their account credentials, providing accurate information, and using the service lawfully. Sharing accounts, attempting to bypass usage limits, or interfering with platform security controls may result in suspension or termination.",
      "Because Droplet is account-required, access to chat and protected product areas depends on maintaining an active account and complying with the service rules.",
    ],
  },
  {
    title: "AI-generated content disclaimer",
    paragraphs: [
      "AI-generated output can be incomplete, inaccurate, biased, or unsuitable for a specific use case. Users are responsible for reviewing and validating responses before relying on them for business, legal, medical, financial, or other high-stakes decisions.",
      "Droplet should not be treated as a substitute for licensed professional advice, and generated outputs remain subject to provider limitations and applicable law.",
    ],
  },
  {
    title: "Payment terms",
    paragraphs: [
      "The current approved public prices are Lite for free, Pro for $19, and Premium for $39. Paid tiers are available only after successful payment processing through Stripe or another approved billing provider.",
      "Draft product policy currently treats Pro and Premium as paid access periods rather than auto-renewing subscriptions. Exact renewal, refund, and billing-state handling should be reviewed and finalized before publication.",
    ],
  },
  {
    title: "Refunds, suspension, and termination",
    paragraphs: [
      "Refunds, credits, or billing adjustments are subject to the operator's published policy and applicable law. If a refund policy is offered, it should be stated clearly in production documentation before the service is launched publicly.",
      "Droplet may suspend or terminate access for fraud, abuse, payment issues, security threats, policy violations, or other conduct that creates material risk to the service or its users.",
    ],
  },
  {
    title: "Limitation of liability and governing law",
    paragraphs: [
      "To the maximum extent allowed by law, Droplet and its operators should disclaim indirect, incidental, special, consequential, and punitive damages arising from service use, outages, data loss, or reliance on AI-generated output. Any liability cap and exceptions should be confirmed through legal review before publication.",
      "The governing law and forum for disputes are not defined in the approved repository documents. Those clauses must be finalized by Droplet's legal review process before these draft terms are published as production terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <section className="TermsPage mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-[2rem] border px-6 py-10 shadow-sm",
          "border-lightBorders-400/80 bg-white/76",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
        )}
      >
        <PageHead
          title="Terms & Conditions"
          subtitle="Draft service terms covering account use, pricing, AI-generated content, suspension, and legal review requirements."
        />
        <p className="body-2 mt-5 rounded-2xl bg-lightAccent-100/90 px-4 py-3 text-sm dark:bg-darkAccent-1000/80">
          {legalReviewDisclaimer}
        </p>
      </div>

      {termsSections.map((section) => (
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
    </section>
  );
}
