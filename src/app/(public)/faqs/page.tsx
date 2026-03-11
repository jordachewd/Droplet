import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import FaqsSection from "@/components/sections/faqs-section";
import { SUPPORT_EMAIL } from "@/constants/support";

export const metadata: Metadata = {
  title: "FAQs | Droplet",
  description:
    "Read the most common questions about Droplet plans, support, account requirements, and day-to-day product usage.",
};

export default function FaqsPage() {
  return (
    <section className="FaqsPage mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-[2rem] border px-5 py-6 shadow-sm",
          "border-lightBorders-400/80 bg-white/76",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
        )}
      >
        <FaqsSection />
      </div>

      <div
        className={classNames(
          "rounded-[2rem] border px-6 py-8 shadow-sm",
          "border-lightBorders-400/80 bg-lightBackground-200/85",
          "dark:border-darkBorders-500 dark:bg-jwdMarine-900/82",
        )}
      >
        <h2 className="heading-5">Still need help?</h2>
        <p className="body-2 mt-3 max-w-2xl text-sm md:text-base">
          Review the public plans page for limits and pricing, or reach out to
          the support contact listed below if you need account or billing help.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-lg btn-contained uppercase" href="/plans">
            View plans
          </Link>
          <Link
            className="btn btn-lg btn-outlined uppercase"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
