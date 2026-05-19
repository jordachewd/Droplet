import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import PageHead from "@/components/layout/PageHead";
import {
  cookieCategories,
  legalReviewDisclaimer,
} from "@/constants/cookies-data";
import { getEffectiveSupportEmail } from "@/lib/utils/effective-plan-config";

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
      />
      <p className="body-2 -mt-6 mb-4 text-sm">{legalReviewDisclaimer}</p>

      {cookieCategories.map((category) => (
        <article
          key={category.title}
          className={classNames(
            "rounded-2xl px-6 py-7 shadow-sm",
            "bg-lavenderHaze-100/76 dark:bg-nightIndigo-900/82",
          )}
        >
          <h2 className="heading-5">{category.title}</h2>
          <p className="body-2 mt-4 text-sm md:text-base">
            {category.description}
          </p>
        </article>
      ))}

      <div
        className={classNames(
          "rounded-4xl border px-6 py-7 shadow-sm",
          "bg-lavenderHaze-200/85 dark:bg-nightIndigo-900/82",
        )}
      >
        <h2 className="heading-5">Managing browser preferences</h2>
        <p className="body-2 mt-3 text-sm md:text-base">
          You can usually clear cookies and local storage through your browser
          settings. Doing so may sign you out of Droplet and reset interface
          preferences such as theme mode and sidebar state.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-md btn-contained" href="/privacy">
            Privacy policy
          </Link>
          <Link
            className="btn btn-md btn-outlined"
            href={`mailto:${supportEmail}`}
          >
            Ask a question
          </Link>
        </div>
      </div>
    </>
  );
}
