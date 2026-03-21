import type { Metadata } from "next";
import classNames from "classnames";
import PageHead from "@/components/layout/page-head";
import {
  buildTermsSections,
  legalReviewDisclaimer,
} from "@/constants/terms-data";
import { getEffectivePlanConfig } from "@/lib/utils/effective-plan-config";

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
    <section className="TermsPage mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-4xl px-6 py-10 shadow-sm bg-lavenderHaze-100/76 dark:bg-nightIndigo-900/82",
        )}
      >
        <PageHead
          title="Terms & Conditions"
          subtitle="Draft service terms covering account use, pricing, AI-generated content, suspension, and legal review requirements."
        />
        <p className="body-2 mt-5 rounded-2xl bg-twilightPurple-100/90 px-4 py-3 text-sm dark:bg-dustyBlue-1000/80">
          {legalReviewDisclaimer}
        </p>
      </div>

      {termsSections.map((section) => (
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
    </section>
  );
}
