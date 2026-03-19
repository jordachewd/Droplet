import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  const heroSectionClass = classNames(
    "Hero flex w-full items-center justify-between px-4 pt-14 shadow-2xl",
    "bg-lavenderHaze-100/40 sm:px-6 lg:px-0 dark:bg-nightIndigo-900/40",
  );

  const heroTextClass = classNames(
    "flex w-full flex-col items-center my-12 lg:my-0 gap-8 lg:gap-12",
    "text-center lg:w-1/2 lg:items-start lg:text-left order-1 lg:order-0",
  );

  const heroImageClass = classNames(
    "relative flex w-full justify-center self-end overflow-hidden order-0 lg:order-1",
    "sm:min-h-[420px] lg:w-1/2 lg:min-h-[500px] xl:min-h-[600px] xxl:min-h-[700px]",
  );

  const heroGlowClass = classNames(
    "absolute -bottom-28 left-1/2 z-0 h-[90%] w-[60%] -translate-x-1/2 ",
    "bg-lavenderHaze-500 dark:bg-nightIndigo-500 rounded-full blur-3xl",
  );

  return (
    <section className={heroSectionClass}>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-between lg:flex-row">
        <div className={heroTextClass}>
          <h1 className="heading-1">
            Chat, create, <br />
            and get things done.
          </h1>

          <p className="heading-6 max-w-2xl">
            Unlock all personas across text conversations,
            <br className="hidden lg:flex" />
            image, and audio generation.
          </p>

          <Link className="btn btn-lg btn-contained px-16" href="/app/new">
            Try it for free
          </Link>
        </div>

        <div className={heroImageClass}>
          <Image
            src="/images/lp-hero-image-flipped.png"
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
