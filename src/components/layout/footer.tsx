import classNames from "classnames";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const footerClass = classNames(
    "Footer z-20 flex w-full items-center justify-between border-t",
    "border-lavenderHaze-800/20 bg-lavenderHaze-100",
    "dark:border-nightIndigo-900/80 dark:bg-nightIndigo-1000",
  );

  const footerContentClass = classNames(
    "mx-auto flex w-full max-w-screen-2xl px-4 flex-col items-center",
    "lg:flex-row lg:py-3 justify-between gap-3 py-6",
  );

  return (
    <footer className={footerClass}>
      <div className={footerContentClass}>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex border-r border-black/25 pr-4 dark:border-white/10">
            <Image
              src="/images/jwd_light.png"
              alt="JordacheWD logo"
              width={32}
              height={32}
              className="z-10"
              priority
            />
          </div>

          <div className="flex flex-col text-xxs leading-3">
            <span>&copy; {new Date().getFullYear()} JordacheWD.</span>
            <span>All rights reserved.</span>
          </div>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex items-center gap-4 text-xs text-midnightBlue-700 dark:text-lavenderHaze-700"
        >
          <Link href="/privacy">Privacy &amp; Cookie Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </nav>
      </div>
    </footer>
  );
}
