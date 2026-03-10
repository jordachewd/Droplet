import Plans from "./plans-section";
import Faqs from "./faqs-section";
import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const heroSectionClass = classNames(
    "flex w-full items-center justify-between px-4 pt-14 shadow-sm",
    "bg-white/50 sm:px-6 lg:px-8 dark:bg-darkPrimary-900/50",
  );

  const heroImageWrapperClass = classNames(
    "relative flex w-full justify-center self-end overflow-hidden",
    "sm:min-h-[420px] lg:w-1/2 lg:min-h-[500px] xl:min-h-[600px] xxl:min-h-[700px]",
  );

  const heroGlowClass = classNames(
    "absolute -bottom-28 left-1/2 z-0 h-[90%] w-[60%] -translate-x-1/2 rounded-full blur-3xl",
    "bg-lightSecondary-400/30 dark:bg-darkSecondary-400/20",
  );

  return (
    <section
      className="LandingPage relative z-10 -mt-16 mb-10 flex w-full flex-1 flex-col items-center gap-10"
      id="LandingPageWrapper"
    >
      <div className={heroSectionClass}>
        <div className="mx-auto mt-12 flex max-w-screen-2xl flex-col items-center justify-between lg:mt-0 lg:flex-row lg:gap-5">
          <div className="flex w-full flex-col items-center gap-12 text-center lg:w-1/2 lg:items-start lg:text-left">
            <h1 className="heading-2 leading-tight">
              A smarter way to chat, create, and get things done.
            </h1>

            <p className="heading-6 max-w-2xl">
              Unlock all personas across text conversations, image, and audio
              generation.
              <br />
              Upgrade when you want higher limits and Premium video generation.
            </p>

            <Link
              className="btn btn-lg btn-outlined w-full max-w-[300px] p-4 uppercase"
              href="/app/new"
            >
              Try it for free
            </Link>
          </div>

          <div className={heroImageWrapperClass}>
            <Image
              src="/images/droplet-hero-860x860.png"
              alt="hero"
              width={860}
              height={860}
              priority
              className="z-10"
            />

            <div className={heroGlowClass}>&nbsp;</div>
          </div>
        </div>
      </div>

      <Plans />
      <Faqs />
    </section>
  );
}
