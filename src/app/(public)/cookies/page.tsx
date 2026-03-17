import type { Metadata } from "next";
import classNames from "classnames";
import Link from "next/link";
import PageHead from "@/components/layout/page-head";
import {
  cookieCategories,
  legalReviewDisclaimer,
} from "@/constants/cookies-data";
import { SUPPORT_EMAIL } from "@/constants/support";

export const metadata: Metadata = {
  title: "Cookie Policy | Droplet",
  description:
    "Review the essential cookies and browser storage preferences used by Droplet, including Clerk auth cookies and legacy migration keys.",
};

export default function CookiesPage() {
  return (
    <section className="CookiesPage mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div
        className={classNames(
          "rounded-4xl border px-6 py-10 shadow-sm",
          "border-slate-400/80 bg-lightBackground-100/76",
          "dark:border-slate-500 dark:bg-darkBackground-900/82",
        )}
      >
        <PageHead
          title="Cookie Policy"
          subtitle="What Droplet stores in the browser today, why it is needed, and what should be disclosed before adding anything optional."
        />
        <p className="body-2 mt-5 rounded-2xl bg-grass-100/90 px-4 py-3 text-sm dark:bg-grass-1000/80">
          {legalReviewDisclaimer}
        </p>
      </div>

      {cookieCategories.map((category) => (
        <article
          key={category.title}
          className={classNames(
            "rounded-4xl border px-6 py-7 shadow-sm",
            "border-slate-400/80 bg-lightBackground-100/76",
            "dark:border-slate-500 dark:bg-darkBackground-900/82",
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
          "border-slate-400/80 bg-lightBackground-200/85",
          "dark:border-slate-500 dark:bg-darkBackground-900/82",
        )}
      >
        <h2 className="heading-5">Managing browser preferences</h2>
        <p className="body-2 mt-3 text-sm md:text-base">
          You can usually clear cookies and local storage through your browser
          settings. Doing so may sign you out of Droplet and reset interface
          preferences such as theme mode and sidebar state.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-lg btn-contained uppercase" href="/privacy">
            Privacy policy
          </Link>
          <Link
            className="btn btn-lg btn-outlined uppercase"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            Ask a question
          </Link>
        </div>
      </div>
    </section>
  );
}
