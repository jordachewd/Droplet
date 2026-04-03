import classNames from "classnames";
import Link from "next/link";
import { HomepageCopy } from "@/constants/homepage-copy";

interface CtaBannerProps {
  copy: Pick<
    HomepageCopy,
    "ctaHeading" | "ctaDescription" | "ctaPrimaryLabel" | "ctaSecondaryLabel"
  >;
}

export default function CtaBanner({ copy }: CtaBannerProps) {
  return (
    <section className="CtaBanner mx-auto w-full max-w-screen-2xl px-4">
      <div
        className={classNames(
          "rounded-2xl px-6 py-8 shadow-sm bg-linear-245 from-limeGreen-100 via-lavenderHaze-100 to-white",
          "dark:bg-linear-135 dark:from-twilightPurple-1000 dark:via-twilightPurple-800 dark:to-twilightPurple-600",
        )}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col max-w-2xl gap-6">
            <h2 className="heading-5 leading-tight">{copy.ctaHeading}</h2>
            <p className="body-2 text-sm md:text-base">{copy.ctaDescription}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="btn btn-lg btn-contained uppercase"
              href="/sign-up"
            >
              {copy.ctaPrimaryLabel}
            </Link>
            <Link className="btn btn-lg btn-outlined uppercase" href="/plans">
              {copy.ctaSecondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
