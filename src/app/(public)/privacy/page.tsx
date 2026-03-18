import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import {
  legalReviewDisclaimer,
  privacySections,
} from "@/constants/privacy-data";
import { SUPPORT_EMAIL } from "@/constants/support";

export const metadata: Metadata = {
  title: "Privacy Policy | Droplet",
  description:
    "Review how Droplet handles account data, conversations, files, billing records, cookies, and third-party service providers.",
};

export default function PrivacyPage() {
  const privacySectionsWithContact = [
    ...privacySections,
    {
      title: "User rights and contact",
      paragraphs: [
        "Users should have a way to request access, correction, deletion, or export of data subject to legal, billing, fraud-prevention, and security constraints. Exact response timelines and jurisdiction-specific rights should be finalized before production use.",
        `For privacy inquiries, support requests, or escalation related to account data, contact \`${SUPPORT_EMAIL}\` unless and until Droplet publishes a different official privacy contact.`,
      ],
    },
  ];

  return (
    <section className="PrivacyPage mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-4xl border px-6 py-10 shadow-sm",
          "border-slate-400/80 bg-lavenderHaze-100/76",
          "dark:border-slate-500 dark:bg-nightIndigo-900/82",
        )}
      >
        <PageHead
          title="Privacy Policy"
          subtitle="How Droplet handles account data, conversations, stored assets, billing records, and provider integrations."
        />
        <p className="body-2 mt-5 rounded-2xl bg-twilightPurple-100/90 px-4 py-3 text-sm dark:bg-dustyBlue-1000/80">
          {legalReviewDisclaimer}
        </p>
      </div>

      {privacySectionsWithContact.map((section) => (
        <article
          key={section.title}
          className={classNames(
            "rounded-4xl border px-6 py-7 shadow-sm",
            "border-slate-400/80 bg-lavenderHaze-100/76",
            "dark:border-slate-500 dark:bg-nightIndigo-900/82",
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
          "rounded-4xl border px-6 py-7 shadow-sm",
          "border-slate-400/80 bg-lavenderHaze-200/85",
          "dark:border-slate-500 dark:bg-nightIndigo-900/82",
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
