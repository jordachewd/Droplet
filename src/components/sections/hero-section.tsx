import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  const heroSectionClass = classNames(
    "Hero flex w-full items-center justify-between px-4 pt-14 shadow-sm",
    "bg-lavenderHaze-100/50 sm:px-6 lg:px-0 dark:bg-nightIndigo-900/50",
  );
  const heroImageWrapperClass = classNames(
    "relative flex w-full justify-center self-end overflow-hidden",
    "sm:min-h-[420px] lg:w-1/2 lg:min-h-[500px] xl:min-h-[600px] xxl:min-h-[700px]",
  );
  const heroGlowClass = classNames(
    "absolute -bottom-28 left-1/2 z-0 h-[90%] w-[60%] -translate-x-1/2 rounded-full blur-3xl",
    "bg-lavenderHaze-400/30 dark:bg-nightIndigo-400/20",
  );

  return (
    <section className={heroSectionClass}>
      <div className="mx-auto mt-12 flex w-full max-w-screen-2xl flex-col items-center justify-between lg:mt-0 lg:flex-row lg:gap-8">
        <div className="flex w-full flex-col items-center gap-12 text-center lg:w-1/2 lg:items-start lg:text-left">
          <h1 className="heading-2 leading-tight">
            Chat, create,
            <br />
            and get things done.
          </h1>

          <p className="heading-6 max-w-2xl">
            Unlock all personas across text conversations, image, and audio
            generation.
            <br />
            Upgrade when you want higher limits and Premium video generation.
          </p>

          <Link
            className="btn btn-lg btn-outlined w-full max-w-75 p-4 uppercase"
            href="/app/new"
          >
            Try it for free
          </Link>
        </div>

        <div className={heroImageWrapperClass}>
          <Image
            src="/images/droplet-hero-860x860.png"
            alt="hero"
            width={700}
            height={700}
            priority
            className="z-10"
          />

          <div className={heroGlowClass}>&nbsp;</div>
        </div>
      </div>
    </section>
  );
}
