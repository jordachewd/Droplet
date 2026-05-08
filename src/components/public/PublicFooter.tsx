import Image from "next/image";
import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-wrapper">
        <div className="public-footer-content">
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

          <div className="flex flex-col text-xxs leading-3 font-medium">
            <span>&copy; {new Date().getFullYear()} JordacheWD.</span>
            <span>All rights reserved.</span>
          </div>
        </div>

        <nav className="public-footer-nav" aria-label="Footer navigation">
          <Link href="/privacy">Privacy &amp; Cookie Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </nav>
      </div>
    </footer>
  );
}
