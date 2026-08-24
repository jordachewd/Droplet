import { MainNavLink } from "@/types/MainNav";
import classNames from "classnames";
import Link from "next/link";

type PublicHeaderProps = {
  open: boolean;
  navLinks: MainNavLink[];
  onClose: () => void;
};

export default function PublicMobileNav({
  open,
  navLinks,
  onClose,
}: Readonly<PublicHeaderProps>) {
  const navCss = classNames("public-mobile-nav", {
    "public-mobile-nav--open": open,
  });

  return (
    <nav
      className={navCss}
      id="mobile-main-navigation"
      aria-label="Mobile main navigation"
      aria-hidden={!open}
      hidden={!open}
    >
      <div className="public-mobile-nav-content">
        {navLinks.map((link) => (
          <Link
            key={`mobile-${link.href}`}
            className="public-mobile-nav-link menu-item"
            href={link.href}
            onClick={onClose}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
