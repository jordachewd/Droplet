import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const footerClass = classNames(
    "Footer z-20 flex w-full items-center justify-between border-t px-4",
    "border-lightPrimary-800/20 bg-white",
    "dark:border-jwdMarine-900/80 dark:bg-jwdMarine-1000",
  );

  const footerContentClass = classNames(
    "mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-between gap-3 py-6",
    "lg:flex-row lg:py-3",
  );

  return (
    <section className={footerClass}>
      <div className={footerContentClass}>
        <div className="flex items-center gap-4 text-xs opacity-60">
          <div className="flex border-r border-black/25 pr-4 dark:border-white/10">
            <Image
              src="/images/jwd_light.png"
              alt="JWD"
              width={32}
              height={32}
              className="z-10 opacity-50"
              priority
            />
          </div>

          <div className="flex flex-col text-xxs leading-3">
            <span>&copy; {new Date().getFullYear()} JordacheWD.</span>
            <span>All rights reserved.</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs opacity-60">
          <Link href="/privacy">Privacy &amp; Cookie Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>
    </section>
  );
}
